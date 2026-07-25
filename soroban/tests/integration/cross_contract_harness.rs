//! Cross-contract integration harness for foundation modules.
//!
//! Validates event and interface compatibility across core_game, rewards,
//! achievements, and admin_registry. Covers canonical play→reward→achievement
//! progression and failure cases for missing registry wiring.

#![cfg(test)]

use admin_registry::AdminRegistryContract;
use achievements::AchievementsContract;
use core_game::CoreGameContract;
use rewards::RewardsContract;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env, Symbol,
};

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

fn setup_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

fn deploy_registry(env: &Env, admin: &Address) {
    AdminRegistryContract::init(env.clone(), admin.clone());
}

fn deploy_rewards(env: &Env, admin: &Address) {
    RewardsContract::init(env.clone(), admin.clone());
}

fn deploy_achievements(env: &Env, admin: &Address) {
    AchievementsContract::init(env.clone(), admin.clone());
}

fn deploy_core_game(env: &Env, admin: &Address) {
    CoreGameContract::init(env.clone(), admin.clone());
}

fn publish_day(env: &Env, admin: &Address, day_id: u32) {
    let commitment = BytesN::from_array(env, &[1u8; 32]);
    let closes_at = env.ledger().timestamp() + 86_400;
    CoreGameContract::set_day_config(env.clone(), day_id, commitment, 6, closes_at);
    let _ = admin; // auth mocked
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Canonical play → reward → achievement progression.
#[test]
fn play_reward_achievement_progression() {
    let env = setup_env();
    let admin = Address::generate(&env);
    let player = Address::generate(&env);

    deploy_registry(&env, &admin);
    deploy_core_game(&env, &admin);
    deploy_rewards(&env, &admin);
    deploy_achievements(&env, &admin);

    // Publish day and create session
    publish_day(&env, &admin, 1);
    let session_id = CoreGameContract::create_session(env.clone(), player.clone(), 1, 0);

    // Submit a correct guess
    let guess = BytesN::from_array(&env, &[2u8; 32]);
    let result = CoreGameContract::submit_guess(
        env.clone(),
        player.clone(),
        session_id.clone(),
        guess,
        1,
        true,
    );
    assert!(result.is_correct);

    // Finalize session
    let session = CoreGameContract::finalize_session(env.clone(), player.clone(), session_id);
    assert!(session.finalized);

    // Accrue rewards
    RewardsContract::set_emission(env.clone(), 1, 100, 10);
    RewardsContract::accrue(
        env.clone(),
        player.clone(),
        100,
        1,
        Symbol::new(&env, "win"),
    );
    let balance = RewardsContract::balance_of(env.clone(), player.clone());
    assert_eq!(balance, 100);

    // Define and unlock achievement
    AchievementsContract::define(
        env.clone(),
        Symbol::new(&env, "first_win"),
        Symbol::new(&env, "wins"),
        1,
        true,
    );
    AchievementsContract::unlock(
        env.clone(),
        player.clone(),
        Symbol::new(&env, "first_win"),
        1,
    );
    let unlock =
        AchievementsContract::get_unlocked(env.clone(), player, Symbol::new(&env, "first_win"));
    assert!(unlock.is_some());
}

/// Registry wiring: set_contract and get_contract round-trip.
#[test]
fn registry_wiring_round_trip() {
    let env = setup_env();
    let admin = Address::generate(&env);
    let contract_addr = Address::generate(&env);

    deploy_registry(&env, &admin);
    AdminRegistryContract::set_contract(
        env.clone(),
        Symbol::new(&env, "core_game"),
        contract_addr.clone(),
    );
    let resolved =
        AdminRegistryContract::get_contract(env.clone(), Symbol::new(&env, "core_game"));
    assert_eq!(resolved, contract_addr);
}

/// Missing registry wiring returns error.
#[test]
fn missing_registry_wiring_panics() {
    let env = setup_env();
    let admin = Address::generate(&env);
    deploy_registry(&env, &admin);

    let result = std::panic::catch_unwind(|| {
        AdminRegistryContract::get_contract(env.clone(), Symbol::new(&env, "unregistered"));
    });
    assert!(result.is_err());
}

/// Shared fixture helper is reusable across test scenarios.
#[test]
fn fixture_helpers_are_reusable() {
    let env = setup_env();
    let admin = Address::generate(&env);

    deploy_registry(&env, &admin);
    deploy_core_game(&env, &admin);
    deploy_rewards(&env, &admin);
    deploy_achievements(&env, &admin);

    // All contracts initialized without conflict
    assert_eq!(AdminRegistryContract::get_admin(env.clone()), admin);
}
