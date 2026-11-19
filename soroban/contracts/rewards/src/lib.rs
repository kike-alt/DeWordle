#![no_std]

pub mod fixtures;
pub mod payout_throttle;
pub mod utils;

use dewordle_auth::require_owner_or_admin;
use dewordle_utils::metadata::{self, ContractMetadata, MetadataDefaults};
use dewordle_utils::ReentrancyGuard;
use soroban_sdk::{BytesN,
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, Symbol, Vec,
};

/// Bounds every reward multiplier must stay within.
pub const MIN_MULTIPLIER: u32 = 1;
pub const MAX_MULTIPLIER: u32 = 10;

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Emission(u32),
    Balance(Address),
    Claimed(Address),
    Nonce(Address, u64),
    GamesWon(Address),
    Rank(Address),
    /// Ledger sequence of the player's last claim (temporary storage).
    LastClaimedLedger(Address),
}

/// Minimum number of ledgers between two claims by the same player.
pub const CLAIM_COOLDOWN_LEDGERS: u32 = 100;
/// Claimants holding more than this balance skip the cooldown.
pub const CLAIM_COOLDOWN_BYPASS_BALANCE: u64 = 1_000_000;

#[derive(Clone)]
#[contracttype]
pub struct EmissionConfig {
    pub day_id: u32,
    pub win_points: u64,
    pub participation_points: u64,
}

/// Lifetime statistics for a player.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct PlayerStats {
    /// Total games won by the player.
    pub games_won: u32,
    /// Total tokens earned (claimed + currently held balance).
    pub tokens_earned: u64,
    /// Current leaderboard rank (0 when unranked).
    pub rank: u32,
}

#[derive(Clone)]
#[contracterror]
#[repr(u32)]
pub enum RewardsError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidNonce = 4,
    /// A balance or lifetime total would exceed `u64::MAX`.
    Overflow = 5,
    /// The player claimed fewer than `CLAIM_COOLDOWN_LEDGERS` ledgers ago.
    CooldownActive = 6,
}

/// Most days `get_emission_schedule` returns per call.
pub const MAX_SCHEDULE_DAYS: u32 = 14;
/// Base emission reported for days that have no configured emission.
pub const DEFAULT_WIN_POINTS: u64 = 100;
pub const DEFAULT_PARTICIPATION_POINTS: u64 = 10;

/// Names of the public entrypoints; hashed into `get_metadata().abi_hash`.
/// Update this list (and bump the version) whenever the public ABI changes.
const METADATA_DEFAULTS: MetadataDefaults = MetadataDefaults {
    version: 4,
    abi_descriptor: "accrue\nbalance_of\nclaim\nclaimed_total\nget_emission\nget_metadata\nget_multiplier\nget_player_stats\nget_streak_multiplier\ninit\nrecord_win\nset_emission\nset_rank\nupdate_metadata\nverify_signature\nversion",
    min_sdk_version: "0.1.0",
};

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    pub fn get_multiplier(env: Env, attempts: u32) -> u32 {
        let raw = if attempts <= 3 {
            3
        } else if attempts <= 5 {
            2
        } else {
            1
        };
        // Whatever the schedule above becomes, the result stays in range.
        raw.clamp(MIN_MULTIPLIER, MAX_MULTIPLIER)
    }

    pub fn get_streak_multiplier(env: Env, streak_days: u32) -> u32 {
        if streak_days >= 10 {
            3
        } else if streak_days >= 5 {
            2
        } else {
            1
        }
    }

    pub fn verify_signature(env: Env, public_key: soroban_sdk::BytesN<32>, signature: soroban_sdk::BytesN<64>, message: soroban_sdk::Bytes) -> bool {
        // Enforce strict cryptographic signature checks
        env.crypto().ed25519_verify(&public_key, &message, &signature);
        true
    }

    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, RewardsError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        metadata::store_defaults(&env, &METADATA_DEFAULTS);
        env.events().publish((Symbol::new(&env, "rewards_initialized"),), admin);
    }

    pub fn set_emission(
        env: Env,
        day_id: u32,
        win_points: u64,
        participation_points: u64,
    ) {
        Self::require_admin(&env);
        let cfg = EmissionConfig {
            day_id,
            win_points,
            participation_points,
        };
        env.storage().persistent().set(&DataKey::Emission(day_id), &cfg);
        env.events().publish((Symbol::new(&env, "emission_set"), day_id), cfg);
    }

    /// Admin-only: caps how much a single `claim` pays out. 0 removes the cap.
    pub fn set_max_claim_cap(env: Env, cap: u64) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::MaxClaimCap, &cap);
        env.events().publish((Symbol::new(&env, "max_claim_cap_set"),), cap);
    }

    pub fn accrue(env: Env, player: Address, points: u64, nonce: u64, reason: Symbol) {
        Self::require_admin(&env);
        // Zero points would burn gas and emit an empty event for no benefit.
        if points == 0 {
            panic_with_error!(&env, RewardsError::InvalidAmount);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Nonce(player.clone(), nonce))
        {
            panic_with_error!(&env, RewardsError::InvalidNonce);
        }

        let balance = Self::balance_of(env.clone(), player.clone());
        // Reject instead of wrapping or trapping: the error code tells the
        // caller the balance cap was hit.
        let new_balance = balance
            .checked_add(points)
            .unwrap_or_else(|| panic_with_error!(&env, RewardsError::Overflow));
        env.storage()
            .persistent()
            .set(&DataKey::Balance(player.clone()), &new_balance);
        env.storage()
            .persistent()
            .set(&DataKey::Nonce(player.clone(), nonce), &true);

        env.events().publish(
            (Symbol::new(&env, "accrued"), player, reason),
            (points, nonce),
        );
    }

    pub fn claim(env: Env, player: Address) -> u64 {
        Self::claim_for(env, player.clone(), player)
    }

    /// Claims `player`'s balance. `caller` must be the player or the admin
    /// (explicit override, which emits an `admin_claim` event); anyone else
    /// panics with `AuthError::NotOwnerOrAdmin`.
    pub fn claim_for(env: Env, caller: Address, player: Address) -> u64 {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(&env, RewardsError::NotInitialized));
        let by_admin = require_owner_or_admin(&env, &player, &caller, &admin);
        // Payout path: block nested entry while balances are being moved.
        let _guard = ReentrancyGuard::enter(&env);

        let balance = Self::balance_of(env.clone(), player.clone());

        // Cooldown: reject repeat claims within the window unless the
        // claimant's balance is above the bypass threshold.
        let cooldown_key = DataKey::LastClaimedLedger(player.clone());
        if balance <= CLAIM_COOLDOWN_BYPASS_BALANCE {
            if let Some(last) = env.storage().temporary().get::<_, u32>(&cooldown_key) {
                if env.ledger().sequence() < last.saturating_add(CLAIM_COOLDOWN_LEDGERS) {
                    panic_with_error!(&env, RewardsError::CooldownActive);
                }
            }
        }
        env.storage()
            .temporary()
            .set(&cooldown_key, &env.ledger().sequence());
        env.storage().temporary().extend_ttl(
            &cooldown_key,
            CLAIM_COOLDOWN_LEDGERS,
            CLAIM_COOLDOWN_LEDGERS,
        );

        env.storage()
            .persistent()
            .set(&DataKey::Balance(player.clone()), &(full_balance - balance));

        let claimed = Self::claimed_total(env.clone(), player.clone());
        let new_claimed = claimed
            .checked_add(balance)
            .unwrap_or_else(|| panic_with_error!(&env, RewardsError::Overflow));
        env.storage()
            .persistent()
            .set(&DataKey::Claimed(player.clone()), &new_claimed);

        if by_admin {
            env.events().publish(
                (Symbol::new(&env, "admin_claim"), player.clone()),
                (caller, balance),
            );
        }
        env.events()
            .publish((Symbol::new(&env, "claimed"), player), balance);
        balance
    }

    pub fn balance_of(env: Env, player: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(player))
            .unwrap_or(0)
    }

    pub fn claimed_total(env: Env, player: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::Claimed(player))
            .unwrap_or(0)
    }

    pub fn get_emission(env: Env, day_id: u32) -> Option<EmissionConfig> {
        env.storage().persistent().get(&DataKey::Emission(day_id))
    }

    /// Emission configs for `count` consecutive days starting at `start_day`
    /// (capped at `MAX_SCHEDULE_DAYS`). Days without a configured emission
    /// report the default base values.
    pub fn get_emission_schedule(env: Env, start_day: u32, count: u32) -> Vec<EmissionConfig> {
        let count = if count > MAX_SCHEDULE_DAYS { MAX_SCHEDULE_DAYS } else { count };
        let mut out: Vec<EmissionConfig> = Vec::new(&env);
        for offset in 0..count {
            let day_id = start_day.saturating_add(offset);
            let cfg = env
                .storage()
                .persistent()
                .get(&DataKey::Emission(day_id))
                .unwrap_or(EmissionConfig {
                    day_id,
                    win_points: DEFAULT_WIN_POINTS,
                    participation_points: DEFAULT_PARTICIPATION_POINTS,
                });
            out.push_back(cfg);
        }
        out
    }

    /// Records a win for a player (admin-gated). Uses the same nonce
    /// replay-protection scheme as `accrue`.
    pub fn record_win(env: Env, player: Address, nonce: u64) {
        Self::require_admin(&env);
        if env
            .storage()
            .persistent()
            .has(&DataKey::Nonce(player.clone(), nonce))
        {
            panic_with_error!(&env, RewardsError::InvalidNonce);
        }

        let games_won = env
            .storage()
            .persistent()
            .get::<_, u32>(&DataKey::GamesWon(player.clone()))
            .unwrap_or(0);
        let new_total = games_won + 1;
        env.storage()
            .persistent()
            .set(&DataKey::GamesWon(player.clone()), &new_total);
        env.storage()
            .persistent()
            .set(&DataKey::Nonce(player.clone(), nonce), &true);

        env.events()
            .publish((Symbol::new(&env, "win_recorded"), player), new_total);
    }

    /// Sets the leaderboard rank for a player (admin-gated).
    pub fn set_rank(env: Env, player: Address, rank: u32) {
        Self::require_admin(&env);
        env.storage().persistent().set(&DataKey::Rank(player.clone()), &rank);
        env.events()
            .publish((Symbol::new(&env, "rank_set"), player), rank);
    }

    /// Returns lifetime statistics for a player.
    ///
    /// First-time players receive a default zeroed struct.
    pub fn get_player_stats(env: Env, player: Address) -> PlayerStats {
        let games_won = env
            .storage()
            .persistent()
            .get::<_, u32>(&DataKey::GamesWon(player.clone()))
            .unwrap_or(0);
        let rank = env
            .storage()
            .persistent()
            .get::<_, u32>(&DataKey::Rank(player.clone()))
            .unwrap_or(0);
        let balance = Self::balance_of(env.clone(), player.clone());
        let claimed = Self::claimed_total(env.clone(), player.clone());

        PlayerStats {
            games_won,
            // A view must never trap, so saturate at the type's maximum.
            tokens_earned: balance.saturating_add(claimed),
            rank,
        }
    }

    /// Version, ABI hash and minimum SDK version, for compatibility checks.
    pub fn get_metadata(env: Env) -> ContractMetadata {
        metadata::read_or_default(&env, &METADATA_DEFAULTS)
    }

    /// Admin-only: record the new metadata after an upgrade.
    pub fn update_metadata(
        env: Env,
        version: u32,
        abi_hash: BytesN<32>,
        min_sdk_version: soroban_sdk::String,
    ) {
        Self::require_admin(&env);
        metadata::update(
            &env,
            &ContractMetadata {
                version,
                abi_hash,
                min_sdk_version,
            },
        );
    }

    pub fn version(env: Env) -> u32 {
        env.events().publish(
            (Symbol::new(&env, "module"), Symbol::new(&env, "rewards")),
            3u32,
        );
        3
    }

    /// Role-based access control check (Issue #1206): verifies the invocation
    /// origin is the configured admin via Soroban's `require_auth`.
    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(env, RewardsError::NotInitialized));

        admin.require_auth();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(RewardsContract, ());
        let client = RewardsContractClient::new(&env, &contract_id);
        client.init(&admin);
        (env, admin, contract_id)
    }

    #[test]
    #[should_panic]
    fn init_twice_panics() {
        let (env, admin, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        client.init(&admin);
    }

    #[test]
    fn accrue_and_balance() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.accrue(&player, &100, &1, &reason);
        assert_eq!(client.balance_of(&player), 100);
    }

    #[test]
    #[should_panic]
    fn nonce_replay_panics() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.accrue(&player, &100, &1, &reason);
        client.accrue(&player, &100, &1, &reason);
    }

    #[test]
    fn claim_resets_balance_and_increases_claimed_total() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.accrue(&player, &50, &1, &reason);
        let claimed = client.claim(&player);
        assert_eq!(claimed, 50);
        assert_eq!(client.balance_of(&player), 0);
        assert_eq!(client.claimed_total(&player), 50);
    }

    #[test]
    #[should_panic]
    fn non_admin_accrue_rejected() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(RewardsContract, ());
        let client = RewardsContractClient::new(&env, &contract_id);
        client.init(&admin);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.accrue(&player, &100, &1, &reason);
    }

    #[test]
    #[should_panic]
    fn distribute_reward_without_admin_auth_panics() {
        // No mock_all_auths: the caller cannot authenticate as the admin role,
        // so the require_auth check must reject the invocation (Issue #1206).
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(RewardsContract, ());
        let client = RewardsContractClient::new(&env, &contract_id);
        client.init(&admin);
        let recipient = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.distribute_reward(&recipient, &100, &1, &reason);
    }

    #[test]
    fn distribute_reward_increases_recipient_balance() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let recipient = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.distribute_reward(&recipient, &100, &1, &reason);
        assert_eq!(client.balance_of(&recipient), 100);
    }

    #[test]
    #[should_panic]
    fn distribute_reward_nonce_replay_panics() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let recipient = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.distribute_reward(&recipient, &100, &1, &reason);
        client.distribute_reward(&recipient, &100, &1, &reason);
    }

    #[test]
    fn emission_config_read_write() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        client.set_emission(&1, &100, &10);
        let cfg = client.get_emission(&1).unwrap();
        assert_eq!(cfg.win_points, 100);
        assert_eq!(cfg.participation_points, 10);
    }

    #[test]
    fn event_topics_match_fixtures() {
        assert_eq!(fixtures::TOPIC_ACCRUED, "accrued");
        assert_eq!(fixtures::TOPIC_CLAIMED, "claimed");
        assert_eq!(fixtures::TOPIC_EMISSION_SET, "emission_set");
        assert_eq!(fixtures::TOPIC_WIN_RECORDED, "win_recorded");
        assert_eq!(fixtures::TOPIC_RANK_SET, "rank_set");
    }

    #[test]
    fn player_stats_zeroed_for_first_time_player() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let stats = client.get_player_stats(&player);
        assert_eq!(stats.games_won, 0);
        assert_eq!(stats.tokens_earned, 0);
        assert_eq!(stats.rank, 0);
    }

    #[test]
    fn player_stats_reflect_wins_earnings_and_rank() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");

        client.record_win(&player, &1);
        client.record_win(&player, &2);
        client.accrue(&player, &150, &3, &reason);
        client.set_rank(&player, &7);

        let stats = client.get_player_stats(&player);
        assert_eq!(stats.games_won, 2);
        assert_eq!(stats.tokens_earned, 150);
        assert_eq!(stats.rank, 7);

        // After claiming, lifetime earnings are preserved.
        let claimed = client.claim(&player);
        assert_eq!(claimed, 150);
        let stats_after = client.get_player_stats(&player);
        assert_eq!(stats_after.tokens_earned, 150);
        assert_eq!(stats_after.games_won, 2);
        assert_eq!(stats_after.rank, 7);
    }

    #[test]
    #[should_panic]
    fn record_win_nonce_replay_panics() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        client.record_win(&player, &1);
        client.record_win(&player, &1);
    }

    #[test]
    #[should_panic]
    fn non_admin_record_win_rejected() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(RewardsContract, ());
        let client = RewardsContractClient::new(&env, &contract_id);
        client.init(&admin);
        let player = Address::generate(&env);
        client.record_win(&player, &1);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #6)")]
    fn immediate_second_claim_hits_cooldown() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.accrue(&player, &50, &1, &reason);
        client.claim(&player);
        client.accrue(&player, &50, &2, &reason);
        client.claim(&player);
    }

    #[test]
    fn claim_allowed_again_after_cooldown_window() {
        use soroban_sdk::testutils::Ledger;
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.accrue(&player, &50, &1, &reason);
        client.claim(&player);
        env.ledger().with_mut(|l| l.sequence_number += CLAIM_COOLDOWN_LEDGERS);
        client.accrue(&player, &25, &2, &reason);
        assert_eq!(client.claim(&player), 25);
    }

    #[test]
    fn large_balance_bypasses_cooldown() {
        let (env, _, contract_id) = setup();
        let client = RewardsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let reason = Symbol::new(&env, "win");
        client.accrue(&player, &50, &1, &reason);
        client.claim(&player);
        client.accrue(&player, &(CLAIM_COOLDOWN_BYPASS_BALANCE + 1), &2, &reason);
        assert_eq!(client.claim(&player), CLAIM_COOLDOWN_BYPASS_BALANCE + 1);
    }
}
