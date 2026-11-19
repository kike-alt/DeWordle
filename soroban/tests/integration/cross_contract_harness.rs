//! Cross-contract integration harness for the foundation modules.
//!
//! Deploys core_game, rewards, achievements and admin_registry into one test
//! environment and drives them through client calls, exactly as an off-chain
//! orchestrator (the backend) would: the contracts do not call each other, so
//! each step of the play -> reward -> achievement flow is a separate
//! transaction signed by the player or the admin.

use achievements::{AchievementsContract, AchievementsContractClient};
use admin_registry::{AdminRegistryContract, AdminRegistryContractClient};
use core_game::{CoreGameContract, CoreGameContractClient};
use dewordle_types::SessionStatus;
use rewards::{RewardsContract, RewardsContractClient};
use soroban_sdk::testutils::{Address as _, EnvTestConfig, Ledger as _};
use soroban_sdk::{Address, BytesN, Env, Symbol};
use std::time::{Duration, Instant};

const SECONDS_PER_DAY: u64 = 86_400;
/// A real puzzle: five letters, six attempts.
const WORD_LENGTH: u32 = 5;
const MAX_ATTEMPTS: u32 = 6;
const DAY_ID: u32 = 20;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

struct Deployment<'a> {
    env: &'a Env,
    admin: Address,
    registry: AdminRegistryContractClient<'a>,
    core_game: CoreGameContractClient<'a>,
    rewards: RewardsContractClient<'a>,
    achievements: AchievementsContractClient<'a>,
}

fn new_env() -> Env {
    let env = Env::new_with_config(EnvTestConfig { capture_snapshot_at_drop: false });
    env.mock_all_auths();
    env.ledger().set_timestamp(DAY_ID as u64 * SECONDS_PER_DAY + 3_600);
    env
}

/// Registers and initializes all four contracts and wires them into the registry.
fn deploy(env: &Env) -> Deployment<'_> {
    let admin = Address::generate(env);

    let registry_id = env.register(AdminRegistryContract, ());
    let core_id = env.register(CoreGameContract, ());
    let rewards_id = env.register(RewardsContract, ());
    let achievements_id = env.register(AchievementsContract, ());

    let registry = AdminRegistryContractClient::new(env, &registry_id);
    let core_game = CoreGameContractClient::new(env, &core_id);
    let rewards = RewardsContractClient::new(env, &rewards_id);
    let achievements = AchievementsContractClient::new(env, &achievements_id);

    registry.init(&admin);
    core_game.init(&admin);
    rewards.init(&admin);
    achievements.init(&admin);

    registry.set_contract(&Symbol::new(env, "core_game"), &core_id);
    registry.set_contract(&Symbol::new(env, "rewards"), &rewards_id);
    registry.set_contract(&Symbol::new(env, "achievements"), &achievements_id);

    Deployment { env, admin, registry, core_game, rewards, achievements }
}

fn publish_day(d: &Deployment<'_>, day_id: u32) {
    let commitment = BytesN::from_array(d.env, &[1u8; 32]);
    let closes_at = d.env.ledger().timestamp() + SECONDS_PER_DAY;
    d.core_game.set_day_config(&day_id, &commitment, &MAX_ATTEMPTS, &closes_at);
}

/// Plays one session: `wrong_guesses` misses, then (if `solve`) the winning guess.
fn play_session(
    d: &Deployment<'_>,
    player: &Address,
    day_id: u32,
    nonce: u32,
    wrong_guesses: u32,
    solve: bool,
) -> BytesN<32> {
    let session_id = d.core_game.create_session(player, &day_id, &nonce);
    for attempt in 1..=wrong_guesses {
        let commitment = BytesN::from_array(d.env, &[attempt as u8; 32]);
        let result = d.core_game.submit_guess(player, &session_id, &commitment, &1, &false);
        assert_eq!(result.attempt_no, attempt);
        assert!(!result.is_correct);
    }
    if solve {
        let winning = BytesN::from_array(d.env, &[0xAA; 32]);
        let result = d.core_game.submit_guess(player, &session_id, &winning, &2, &true);
        assert!(result.is_correct);
        assert_eq!(result.attempt_no, wrong_guesses + 1);
    }
    session_id
}

/// Everything a finished game should leave behind, compared in one assertion
/// (the same expected-state pattern as the contracts' test snapshots).
#[derive(Debug, PartialEq, Eq)]
struct ExpectedState {
    won: bool,
    finalized: bool,
    attempts_used: u32,
    streak_current: u32,
    streak_max: u32,
    reward_balance: u64,
    reward_claimed: u64,
    games_won: u32,
    achievement_unlocked: bool,
}

// ---------------------------------------------------------------------------
// Full game lifecycle
// ---------------------------------------------------------------------------

/// Win on the fourth guess, then accrue, claim and unlock — across all four contracts.
#[test]
fn full_game_lifecycle_win_accrues_rewards_and_unlocks_achievement() {
    let started = Instant::now();
    let env = new_env();
    let d = deploy(&env);
    let player = Address::generate(&env);

    // The registry resolves every wired contract.
    assert_eq!(
        d.registry.get_contract(&Symbol::new(&env, "core_game")),
        d.core_game.address
    );

    // --- core_game: create the session and play to completion -------------
    publish_day(&d, DAY_ID);
    assert_eq!(d.core_game.get_game_config().word_length, WORD_LENGTH);
    let session_id = play_session(&d, &player, DAY_ID, 0, 3, true);

    let session = d.core_game.get_session(&session_id);
    assert!(matches!(session.status, SessionStatus::Won));
    assert_eq!(session.attempts_used, 4);

    let finalized = d.core_game.finalize_session(&player, &session_id);
    assert!(finalized.finalized);

    // --- rewards: admin accrues points scaled by how fast the player won ---
    d.rewards.set_emission(&DAY_ID, &100, &10);
    let multiplier = d.rewards.get_multiplier(&finalized.attempts_used) as u64;
    assert_eq!(multiplier, 2, "a 4-attempt win earns the 2x tier");
    let emission = d.rewards.get_emission(&DAY_ID).expect("emission configured");
    let points = emission.win_points * multiplier;
    d.rewards.accrue(&player, &points, &1, &Symbol::new(&env, "win"));
    d.rewards.record_win(&player, &2);
    assert_eq!(d.rewards.balance_of(&player), 200);

    let claimed = d.rewards.claim(&player);
    assert_eq!(claimed, 200);

    // --- achievements: define and unlock "first_win" -----------------------
    let first_win = Symbol::new(&env, "first_win");
    d.achievements.define(
        &first_win,
        &Symbol::new(&env, "wins"),
        &1,
        &true,
        &Symbol::new(&env, "general"),
    );
    d.achievements.unlock(&player, &first_win, &1);

    // --- the whole outcome, in one comparison ------------------------------
    let streak = d.core_game.get_streak(&player);
    let stats = d.rewards.get_player_stats(&player);
    let actual = ExpectedState {
        won: matches!(session.status, SessionStatus::Won),
        finalized: finalized.finalized,
        attempts_used: finalized.attempts_used,
        streak_current: streak.current,
        streak_max: streak.max,
        reward_balance: d.rewards.balance_of(&player),
        reward_claimed: d.rewards.claimed_total(&player),
        games_won: stats.games_won,
        achievement_unlocked: d.achievements.get_unlocked(&player, &first_win).is_some(),
    };
    assert_eq!(
        actual,
        ExpectedState {
            won: true,
            finalized: true,
            attempts_used: 4,
            streak_current: 1,
            streak_max: 1,
            reward_balance: 0,
            reward_claimed: 200,
            games_won: 1,
            achievement_unlocked: true,
        }
    );
    assert_eq!(stats.tokens_earned, 200);

    assert!(started.elapsed() < Duration::from_secs(30), "lifecycle test must stay under 30 s");
}

/// A lost game still finalizes, earns the participation reward only, and unlocks nothing.
#[test]
fn full_game_lifecycle_loss_earns_participation_only() {
    let env = new_env();
    let d = deploy(&env);
    let player = Address::generate(&env);

    publish_day(&d, DAY_ID);
    let session_id = play_session(&d, &player, DAY_ID, 0, MAX_ATTEMPTS, false);

    let session = d.core_game.get_session(&session_id);
    assert!(matches!(session.status, SessionStatus::Lost));
    assert_eq!(session.attempts_used, MAX_ATTEMPTS);
    d.core_game.finalize_session(&player, &session_id);

    d.rewards.set_emission(&DAY_ID, &100, &10);
    let emission = d.rewards.get_emission(&DAY_ID).unwrap();
    d.rewards.accrue(&player, &emission.participation_points, &1, &Symbol::new(&env, "play"));

    assert_eq!(d.rewards.balance_of(&player), 10);
    assert_eq!(d.rewards.get_player_stats(&player).games_won, 0);

    let first_win = Symbol::new(&env, "first_win");
    d.achievements.define(
        &first_win,
        &Symbol::new(&env, "wins"),
        &1,
        &true,
        &Symbol::new(&env, "general"),
    );
    assert!(d.achievements.get_unlocked(&player, &first_win).is_none());
}

/// Consecutive daily wins build the streak across the lifecycle.
#[test]
fn full_game_lifecycle_across_consecutive_days_builds_a_streak() {
    let env = new_env();
    let d = deploy(&env);
    let player = Address::generate(&env);

    for (nonce, day) in (DAY_ID..DAY_ID + 3).enumerate() {
        env.ledger().set_timestamp(day as u64 * SECONDS_PER_DAY + 3_600);
        publish_day(&d, day);
        let session_id = play_session(&d, &player, day, nonce as u32, 1, true);
        d.core_game.finalize_session(&player, &session_id);
        d.rewards.record_win(&player, &(nonce as u64));
    }

    let streak = d.core_game.get_streak(&player);
    assert_eq!((streak.current, streak.max), (3, 3));
    assert_eq!(d.rewards.get_player_stats(&player).games_won, 3);
}

/// A player cannot reuse a session nonce or play a session twice.
#[test]
fn lifecycle_rejects_replayed_nonce_and_double_finalize() {
    let env = new_env();
    let d = deploy(&env);
    let player = Address::generate(&env);

    publish_day(&d, DAY_ID);
    let session_id = play_session(&d, &player, DAY_ID, 7, 0, true);
    d.core_game.finalize_session(&player, &session_id);

    assert!(d.core_game.try_create_session(&player, &DAY_ID, &7).is_err());
    assert!(d.core_game.try_finalize_session(&player, &session_id).is_err());
}

// ---------------------------------------------------------------------------
// Wiring and fixtures
// ---------------------------------------------------------------------------

/// Registry wiring: set_contract and get_contract round-trip.
#[test]
fn registry_wiring_round_trip() {
    let env = new_env();
    let d = deploy(&env);
    let other = Address::generate(&env);

    d.registry.set_contract(&Symbol::new(&env, "extra"), &other);
    assert_eq!(d.registry.get_contract(&Symbol::new(&env, "extra")), other);
    assert_eq!(d.registry.get_contract(&Symbol::new(&env, "rewards")), d.rewards.address);
}

/// Missing registry wiring is rejected rather than returning a default address.
#[test]
fn missing_registry_wiring_is_an_error() {
    let env = new_env();
    let d = deploy(&env);
    assert!(d
        .registry
        .try_get_contract(&Symbol::new(&env, "unregistered"))
        .is_err());
}

/// Every contract refuses a second `init`, so deployment wiring cannot be hijacked.
#[test]
fn contracts_cannot_be_initialized_twice() {
    let env = new_env();
    let d = deploy(&env);
    let attacker = Address::generate(&env);

    assert!(d.registry.try_init(&attacker).is_err());
    assert!(d.core_game.try_init(&attacker).is_err());
    assert!(d.rewards.try_init(&attacker).is_err());
    assert!(d.achievements.try_init(&attacker).is_err());
    assert_eq!(d.registry.get_admin(), d.admin);
}

/// Shared fixture helper is reusable across test scenarios.
#[test]
fn fixture_helpers_are_reusable() {
    let env = new_env();
    let first = deploy(&env);
    let second = deploy(&env);
    assert_ne!(first.core_game.address, second.core_game.address);
    assert_eq!(first.registry.get_admin(), first.admin);
    assert_eq!(second.registry.get_admin(), second.admin);
}
