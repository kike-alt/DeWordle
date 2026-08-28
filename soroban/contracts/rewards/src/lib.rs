#![no_std]

pub mod fixtures;
pub mod utils;

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, Symbol,
};

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
}

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
}

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    pub fn get_multiplier(env: Env, attempts: u32) -> u32 {
        if attempts <= 3 {
            3
        } else if attempts <= 5 {
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

    pub fn accrue(env: Env, player: Address, points: u64, nonce: u64, reason: Symbol) {
        Self::require_admin(&env);
        if env
            .storage()
            .persistent()
            .has(&DataKey::Nonce(player.clone(), nonce))
        {
            panic_with_error!(&env, RewardsError::InvalidNonce);
        }

        let balance = Self::balance_of(env.clone(), player.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(player.clone()), &(balance + points));
        env.storage()
            .persistent()
            .set(&DataKey::Nonce(player.clone(), nonce), &true);

        env.events().publish(
            (Symbol::new(&env, "accrued"), player, reason),
            (points, nonce),
        );
    }

    pub fn claim(env: Env, player: Address) -> u64 {
        player.require_auth();

        let balance = Self::balance_of(env.clone(), player.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(player.clone()), &0u64);

        let claimed = Self::claimed_total(env.clone(), player.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Claimed(player.clone()), &(claimed + balance));

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
            tokens_earned: balance + claimed,
            rank,
        }
    }

    pub fn version(env: Env) -> u32 {
        env.events().publish(
            (Symbol::new(&env, "module"), Symbol::new(&env, "rewards")),
            2u32,
        );
        2
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
}
