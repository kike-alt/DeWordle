#![no_std]

pub mod fixtures;

use dewordle_auth::{require_admin, set_admin};
use dewordle_types::{DayConfig, GuessResult, PlayerStreak, Session, SessionStatus};
use dewordle_utils::current_day_id;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, BytesN, Env,
    Symbol,
};
use soroban_sdk::xdr::ToXdr;

const MAX_ATTEMPTS_LIMIT: u32 = 20;

#[derive(Clone)]
#[contracttype]
enum DataKey {
    DayConfig(u32),
    Session(BytesN<32>),
    SessionNonce(Address, u32),
    Streak(Address),
    Paused,
}

#[derive(Clone)]
#[contracterror]
#[repr(u32)]
pub enum CoreGameError {
    AlreadyInitialized = 1,
    InvalidMaxAttempts = 2,
    DayNotFound = 3,
    DayNotActive = 4,
    DayClosed = 5,
    NonceAlreadyUsed = 6,
    SessionNotFound = 7,
    UnauthorizedSessionOwner = 8,
    SessionAlreadyFinalized = 9,
    AttemptLimitReached = 10,
    SessionStillInProgress = 11,
    InvalidCommitment = 13,
    ContractPaused = 14,
}

#[derive(Clone)]
#[contracttype]
pub struct GameConfig {
    pub word_length: u32,
    pub max_attempts: u32,
    pub status: bool,
}

#[contract]
pub struct CoreGameContract;

#[contractimpl]
impl CoreGameContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "initialized")) {
            panic_with_error!(&env, CoreGameError::AlreadyInitialized);
        }

        set_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "initialized"), &true);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.events()
            .publish((Symbol::new(&env, "core_game"), Symbol::new(&env, "initialized")), admin);
    }

    pub fn pause(env: Env, paused: bool) {
        require_admin(&env);
        env.storage().instance().set(&DataKey::Paused, &paused);
        env.events()
            .publish((Symbol::new(&env, "core_game"), Symbol::new(&env, "paused")), paused);
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    pub fn get_game_config(env: Env) -> GameConfig {
        let day_id = current_day_id(&env);
        let config = Self::get_day_config_internal(&env, day_id);
        GameConfig {
            word_length: 5,
            max_attempts: config.max_attempts,
            status: config.published,
        }
    }

    pub fn set_day_config(
        env: Env,
        day_id: u32,
        puzzle_commitment: BytesN<32>,
        max_attempts: u32,
        closes_at: u64,
    ) {
        require_admin(&env);

        if max_attempts == 0 || max_attempts > MAX_ATTEMPTS_LIMIT {
            panic_with_error!(&env, CoreGameError::InvalidMaxAttempts);
        }

        let config = DayConfig {
            day_id,
            puzzle_commitment,
            max_attempts,
            closes_at,
            published: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::DayConfig(day_id), &config);

        env.events()
            .publish((Symbol::new(&env, "day"), Symbol::new(&env, "published"), day_id), config);
    }

    pub fn create_session(env: Env, player: Address, day_id: u32, nonce: u32) -> BytesN<32> {
        Self::require_not_paused(&env);
        player.require_auth();
        let config = Self::get_day_config_internal(&env, day_id);

        if !config.published {
            panic_with_error!(&env, CoreGameError::DayNotActive);
        }

        if env.ledger().timestamp() > config.closes_at {
            panic_with_error!(&env, CoreGameError::DayClosed);
        }

        let nonce_key = DataKey::SessionNonce(player.clone(), nonce);
        if env.storage().persistent().has(&nonce_key) {
            panic_with_error!(&env, CoreGameError::NonceAlreadyUsed);
        }

        let session_id = Self::derive_session_id(&env, &player, day_id, nonce);

        let session = Session {
            id: session_id.clone(),
            player: player.clone(),
            day_id,
            attempts_used: 0,
            max_attempts: config.max_attempts,
            status: SessionStatus::InProgress,
            finalized: false,
            started_at: env.ledger().timestamp(),
            updated_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id.clone()), &session);
        env.storage().persistent().set(&nonce_key, &true);

        env.events().publish(
            (Symbol::new(&env, "session"), Symbol::new(&env, "started"), player, day_id),
            session_id.clone(),
        );

        session_id
    }

    pub fn submit_guess(
        env: Env,
        player: Address,
        session_id: BytesN<32>,
        guess_commitment: BytesN<32>,
        outcome_code: u32,
        is_correct: bool,
    ) -> GuessResult {
        Self::require_not_paused(&env);
        player.require_auth();
        if guess_commitment == BytesN::from_array(&env, &[0; 32]) {
            panic_with_error!(&env, CoreGameError::InvalidCommitment);
        }

        let mut session = Self::get_session_internal(&env, &session_id);

        if session.player != player {
            panic_with_error!(&env, CoreGameError::UnauthorizedSessionOwner);
        }

        if session.finalized {
            panic_with_error!(&env, CoreGameError::SessionAlreadyFinalized);
        }

        if session.attempts_used >= session.max_attempts {
            panic_with_error!(&env, CoreGameError::AttemptLimitReached);
        }

        session.attempts_used += 1;
        session.updated_at = env.ledger().timestamp();

        if is_correct {
            session.status = SessionStatus::Won;
        } else if session.attempts_used >= session.max_attempts {
            session.status = SessionStatus::Lost;
        }

        let result = GuessResult {
            attempt_no: session.attempts_used,
            outcome_code,
            is_correct,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id.clone()), &session);

        env.events().publish(
            (Symbol::new(&env, "guess"), Symbol::new(&env, "submitted"), session_id),
            (guess_commitment, result.clone()),
        );

        result
    }

    pub fn finalize_session(env: Env, player: Address, session_id: BytesN<32>) -> Session {
        Self::require_not_paused(&env);
        player.require_auth();
        let mut session = Self::get_session_internal(&env, &session_id);

        if session.player != player {
            panic_with_error!(&env, CoreGameError::UnauthorizedSessionOwner);
        }

        if session.finalized {
            panic_with_error!(&env, CoreGameError::SessionAlreadyFinalized);
        }

        if matches!(session.status, SessionStatus::InProgress) {
            panic_with_error!(&env, CoreGameError::SessionStillInProgress);
        }

        session.finalized = true;
        session.status = SessionStatus::Finalized;
        session.updated_at = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id.clone()), &session);

        Self::update_streak(&env, &player);

        env.events()
            .publish((Symbol::new(&env, "session"), Symbol::new(&env, "finalized"), session_id), player);

        session
    }

    pub fn get_session(env: Env, session_id: BytesN<32>) -> Session {
        Self::get_session_internal(&env, &session_id)
    }

    pub fn get_day_config(env: Env, day_id: u32) -> DayConfig {
        Self::get_day_config_internal(&env, day_id)
    }

    pub fn get_streak(env: Env, player: Address) -> PlayerStreak {
        env.storage()
            .persistent()
            .get(&DataKey::Streak(player))
            .unwrap_or(PlayerStreak {
                current: 0,
                max: 0,
                last_day_played: 0,
            })
    }

    pub fn is_nonce_used(env: Env, player: Address, nonce: u32) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::SessionNonce(player, nonce))
    }

    pub fn version(env: Env) -> u32 {
        env.events().publish(
            (Symbol::new(&env, "module"), Symbol::new(&env, "core_game")),
            3u32,
        );
        3
    }
}

impl CoreGameContract {
    fn get_day_config_internal(env: &Env, day_id: u32) -> DayConfig {
        env.storage()
            .persistent()
            .get(&DataKey::DayConfig(day_id))
            .unwrap_or_else(|| panic_with_error!(env, CoreGameError::DayNotFound))
    }

    fn get_session_internal(env: &Env, session_id: &BytesN<32>) -> Session {
        env.storage()
            .persistent()
            .get(&DataKey::Session(session_id.clone()))
            .unwrap_or_else(|| panic_with_error!(env, CoreGameError::SessionNotFound))
    }

    fn derive_session_id(env: &Env, player: &Address, day_id: u32, nonce: u32) -> BytesN<32> {
        let preimage = (
            player.clone(),
            day_id,
            nonce,
            env.ledger().sequence(),
            env.ledger().timestamp(),
        );

        let preimage_bytes = preimage.to_xdr(env);
        env.crypto().sha256(&preimage_bytes).into()
    }

    fn update_streak(env: &Env, player: &Address) {
        let mut streak = env
            .storage()
            .persistent()
            .get(&DataKey::Streak(player.clone()))
            .unwrap_or(PlayerStreak {
                current: 0,
                max: 0,
                last_day_played: 0,
            });

        let day = current_day_id(env);

        if streak.last_day_played + 1 == day {
            streak.current = streak.current.checked_add(1).unwrap_or(streak.current);
        } else if streak.last_day_played != day {
            streak.current = 1;
        }

        if streak.current > streak.max {
            streak.max = streak.current;
        }

        streak.last_day_played = day;
        env.storage()
            .persistent()
            .set(&DataKey::Streak(player.clone()), &streak);

        env.events()
            .publish((Symbol::new(env, "streak"), Symbol::new(env, "updated"), player.clone()), streak);
    }

    fn require_not_paused(env: &Env) {
        if env.storage().instance().get(&DataKey::Paused).unwrap_or(false) {
            panic_with_error!(env, CoreGameError::ContractPaused);
        }
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
        let contract_id = env.register(CoreGameContract, ());
        let client = CoreGameContractClient::new(&env, &contract_id);
        client.init(&admin);
        (env, admin, contract_id)
    }

    fn publish_day(env: &Env, client: &CoreGameContractClient<'_>, day_id: u32) {
        let commitment = BytesN::from_array(env, &[1u8; 32]);
        client.set_day_config(&day_id, &commitment, &6, &u64::MAX);
    }

    #[test]
    fn init_sets_unpaused_state() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        assert!(!client.is_paused());
    }

    #[test]
    #[should_panic]
    fn init_twice_panics() {
        let (env, admin, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        client.init(&admin);
    }

    #[test]
    fn pause_and_unpause() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        client.pause(&true);
        assert!(client.is_paused());
        client.pause(&false);
        assert!(!client.is_paused());
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #2)")]
    fn set_day_config_above_max_attempts_limit_panics() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        let commitment = BytesN::from_array(&env, &[1u8; 32]);
        client.set_day_config(&1, &commitment, &(MAX_ATTEMPTS_LIMIT + 1), &u64::MAX);
    }

    #[test]
    #[should_panic]
    fn create_session_when_paused_panics() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        client.pause(&true);
        let player = Address::generate(&env);
        client.create_session(&player, &1, &0);
    }

    #[test]
    fn create_session_success() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        let session = client.get_session(&session_id);
        assert_eq!(session.player, player);
        assert_eq!(session.day_id, 1);
        assert!(!session.finalized);
    }

    #[test]
    #[should_panic]
    fn nonce_reuse_panics() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        client.create_session(&player, &1, &0);
        client.create_session(&player, &1, &0);
    }

    #[test]
    fn is_nonce_used_returns_true_after_session() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        assert!(!client.is_nonce_used(&player, &0));
        client.create_session(&player, &1, &0);
        assert!(client.is_nonce_used(&player, &0));
    }

    #[test]
    fn submit_guess_increments_attempts() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        let commitment = BytesN::from_array(&env, &[2u8; 32]);
        let result = client.submit_guess(&player, &session_id, &commitment, &1, &false);
        assert_eq!(result.attempt_no, 1);
        assert!(!result.is_correct);
    }

    #[test]
    #[should_panic]
    fn submit_guess_zero_commitment_panics() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        let zero = BytesN::from_array(&env, &[0u8; 32]);
        client.submit_guess(&player, &session_id, &zero, &0, &false);
    }

    #[test]
    #[should_panic]
    fn submit_guess_wrong_player_panics() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let other = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        let commitment = BytesN::from_array(&env, &[2u8; 32]);
        client.submit_guess(&other, &session_id, &commitment, &1, &false);
    }

    #[test]
    fn finalize_session_after_win() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        let commitment = BytesN::from_array(&env, &[2u8; 32]);
        client.submit_guess(&player, &session_id, &commitment, &1, &true);
        let session = client.finalize_session(&player, &session_id);
        assert!(session.finalized);
    }

    #[test]
    #[should_panic]
    fn finalize_in_progress_session_panics() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        client.finalize_session(&player, &session_id);
    }

    #[test]
    #[should_panic]
    fn finalize_twice_panics() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        let commitment = BytesN::from_array(&env, &[2u8; 32]);
        client.submit_guess(&player, &session_id, &commitment, &1, &true);
        client.finalize_session(&player, &session_id);
        client.finalize_session(&player, &session_id);
    }

    #[test]
    fn attempt_limit_reached_sets_lost() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        for i in 0..6u8 {
            let commitment = BytesN::from_array(&env, &[i + 2; 32]);
            client.submit_guess(&player, &session_id, &commitment, &0, &false);
        }
        let session = client.get_session(&session_id);
        assert!(matches!(session.status, SessionStatus::Lost));
    }

    #[test]
    fn event_topics_match_fixtures() {
        assert_eq!(fixtures::TOPIC_SESSION_STARTED, ("session", "started"));
        assert_eq!(fixtures::TOPIC_GUESS_SUBMITTED, ("guess", "submitted"));
        assert_eq!(fixtures::TOPIC_SESSION_FINALIZED, ("session", "finalized"));
        assert_eq!(fixtures::TOPIC_DAY_PUBLISHED, ("day", "published"));
        assert_eq!(fixtures::TOPIC_STREAK_UPDATED, ("streak", "updated"));
        assert_eq!(fixtures::TOPIC_CORE_GAME_PAUSED, ("core_game", "paused"));
    }

    #[test]
    fn test_game_loss_on_sixth_incorrect_guess() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        for i in 0..5u8 {
            let commitment = BytesN::from_array(&env, &[i + 2; 32]);
            let res = client.submit_guess(&player, &session_id, &commitment, &0, &false);
            assert_eq!(res.attempt_no, (i + 1) as u32);
            assert!(!res.is_correct);
            let s = client.get_session(&session_id);
            assert!(matches!(s.status, SessionStatus::InProgress));
        }
        let final_commitment = BytesN::from_array(&env, &[7u8; 32]);
        let res = client.submit_guess(&player, &session_id, &final_commitment, &0, &false);
        assert_eq!(res.attempt_no, 6);
        assert!(!res.is_correct);
        let session = client.get_session(&session_id);
        assert!(matches!(session.status, SessionStatus::Lost));
    }

    #[test]
    fn test_game_win_on_sixth_correct_guess() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        for i in 0..5u8 {
            let commitment = BytesN::from_array(&env, &[i + 2; 32]);
            client.submit_guess(&player, &session_id, &commitment, &0, &false);
        }
        let final_commitment = BytesN::from_array(&env, &[7u8; 32]);
        let res = client.submit_guess(&player, &session_id, &final_commitment, &0, &true);
        assert_eq!(res.attempt_no, 6);
        assert!(res.is_correct);
        let session = client.get_session(&session_id);
        assert!(matches!(session.status, SessionStatus::Won));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #10)")]
    fn test_no_guesses_accepted_after_sixth_attempt() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 1);
        let player = Address::generate(&env);
        let session_id = client.create_session(&player, &1, &0);
        for i in 0..6u8 {
            let commitment = BytesN::from_array(&env, &[i + 2; 32]);
            client.submit_guess(&player, &session_id, &commitment, &0, &false);
        }
        let extra_commitment = BytesN::from_array(&env, &[8u8; 32]);
        client.submit_guess(&player, &session_id, &extra_commitment, &0, &false);
    }

    #[test]
    fn test_get_game_config() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        publish_day(&env, &client, 0); // day_id 0 to match default current day calculated from timestamp 0
        let config = client.get_game_config();
        assert_eq!(config.word_length, 5);
        assert_eq!(config.max_attempts, 6);
        assert!(config.status);
    }

    #[test]
    fn test_event_topic_structure() {
        let (env, _, contract_id) = setup();
        let client = CoreGameContractClient::new(&env, &contract_id);
        
        let events = env.events().all();
        assert!(events.len() > 0);
        let event = events.get(0).unwrap();
        assert_eq!(event.0, contract_id);
        let topics = event.1;
        assert_eq!(topics.len(), 2);
        assert_eq!(topics.get(0).unwrap(), Symbol::new(&env, "core_game").into());
        assert_eq!(topics.get(1).unwrap(), Symbol::new(&env, "initialized").into());

        client.pause(&true);
        let events = env.events().all();
        let event = events.get(events.len() - 1).unwrap();
        assert_eq!(event.1.len(), 2);
        assert_eq!(event.1.get(0).unwrap(), Symbol::new(&env, "core_game").into());
        assert_eq!(event.1.get(1).unwrap(), Symbol::new(&env, "paused").into());
    }
}

