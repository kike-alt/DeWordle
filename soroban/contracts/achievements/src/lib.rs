#![no_std]

pub mod fixtures;

use dewordle_utils::metadata::{self, ContractMetadata, MetadataDefaults};
use soroban_sdk::{BytesN, 
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, Symbol,
};

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Definition(Symbol),
    Unlocked(Address, Symbol),
    UnlockNonce(Address, u64),
    /// Number of achievements a player has unlocked.
    UnlockedCount(Address),
}

#[derive(Clone)]
#[contracttype]
pub struct AchievementDefinition {
    pub id: Symbol,
    pub metric: Symbol,
    pub threshold: u32,
    pub enabled: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct AchievementUnlock {
    pub player: Address,
    pub id: Symbol,
    pub unlocked_at: u64,
    pub nonce: u64,
}

#[derive(Clone)]
#[contracterror]
#[repr(u32)]
pub enum AchievementsError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidNonce = 4,
    DefinitionNotFound = 5,
    AlreadyClaimed = 6,
}

/// Names of the public entrypoints; hashed into `get_metadata().abi_hash`.
/// Update this list (and bump the version) whenever the public ABI changes.
const METADATA_DEFAULTS: MetadataDefaults = MetadataDefaults {
    version: 2,
    abi_descriptor: "define\nget_definition\nget_metadata\nget_spec_metadata\nget_unlocked\nget_unlocked_count\ninit\nunlock\nupdate_metadata\nversion",
    min_sdk_version: "0.1.0",
};

#[contract]
pub struct AchievementsContract;

#[contractimpl]
impl AchievementsContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, AchievementsError::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        metadata::store_defaults(&env, &METADATA_DEFAULTS);
        env.events().publish((Symbol::new(&env, "achievements_initialized"),), admin);
    }

    pub fn define(env: Env, id: Symbol, metric: Symbol, threshold: u32, enabled: bool) {
        Self::require_admin(&env);
        let is_update = env
            .storage()
            .persistent()
            .has(&DataKey::Definition(id.clone()));
        let def = AchievementDefinition {
            id: id.clone(),
            metric: metric.clone(),
            threshold,
            enabled,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Definition(id.clone()), &def);
        env.events()
            .publish((Symbol::new(&env, "achievement_defined"), id.clone()), def);
        if is_update {
            // Lets indexers refresh cached definitions without re-reading state.
            env.events().publish(
                (
                    Symbol::new(&env, "achievement"),
                    Symbol::new(&env, "definition_updated"),
                    id,
                ),
                (threshold, metric, enabled),
            );
        }
    }

    pub fn get_spec_metadata(env: Env) -> soroban_sdk::Vec<Symbol> {
        let mut meta = soroban_sdk::Vec::new(&env);
        meta.push_back(Symbol::new(&env, "AchievementsContractSpec"));
        meta.push_back(Symbol::new(&env, "v1.0.0"));
        meta
    }

    pub fn unlock(env: Env, player: Address, id: Symbol, nonce: u64) {
        Self::require_admin(&env);

        if !env.storage().persistent().has(&DataKey::Definition(id.clone())) {
            panic_with_error!(&env, AchievementsError::DefinitionNotFound);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::Unlocked(player.clone(), id.clone()))
        {
            panic_with_error!(&env, AchievementsError::AlreadyClaimed);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::UnlockNonce(player.clone(), nonce))
        {
            panic_with_error!(&env, AchievementsError::InvalidNonce);
        }

        let unlock = AchievementUnlock {
            player: player.clone(),
            id: id.clone(),
            unlocked_at: env.ledger().timestamp(),
            nonce,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Unlocked(player.clone(), id.clone()), &unlock);
        env.storage()
            .persistent()
            .set(&DataKey::UnlockNonce(player.clone(), nonce), &true);
        let count = Self::get_unlocked_count(env.clone(), player.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UnlockedCount(player.clone()), &(count + 1));

        env.events()
            .publish((Symbol::new(&env, "achievement_unlocked"), player, id), unlock);
    }

    pub fn get_definition(env: Env, id: Symbol) -> Option<AchievementDefinition> {
        env.storage().persistent().get(&DataKey::Definition(id))
    }

    pub fn get_unlocked(env: Env, player: Address, id: Symbol) -> Option<AchievementUnlock> {
        env.storage().persistent().get(&DataKey::Unlocked(player, id))
    }

    /// Number of distinct achievements `player` has unlocked (0 if none).
    pub fn get_unlocked_count(env: Env, player: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::UnlockedCount(player))
            .unwrap_or(0)
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
            (Symbol::new(&env, "module"), Symbol::new(&env, "achievements")),
            2u32,
        );
        2
    }

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(env, AchievementsError::NotInitialized));

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
        let contract_id = env.register(AchievementsContract, ());
        let client = AchievementsContractClient::new(&env, &contract_id);
        client.init(&admin);
        (env, admin, contract_id)
    }

    fn define_achievement(env: &Env, client: &AchievementsContractClient<'_>, id: &str) {
        client.define(&Symbol::new(env, id), &Symbol::new(env, "streak"), &5, &true);
    }

    #[test]
    #[should_panic]
    fn init_twice_panics() {
        let (env, admin, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        client.init(&admin);
    }

    #[test]
    #[should_panic]
    fn unlock_missing_definition_panics() {
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        let missing = Symbol::new(&env, "missing");
        client.unlock(&player, &missing, &1);
    }

    #[test]
    #[should_panic]
    fn unlock_nonce_replay_panics() {
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        define_achievement(&env, &client, "first");
        let first = Symbol::new(&env, "first");
        client.unlock(&player, &first, &1);
        client.unlock(&player, &first, &1);
    }

    #[test]
    fn unlock_success() {
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        define_achievement(&env, &client, "first");
        let first = Symbol::new(&env, "first");
        client.unlock(&player, &first, &1);
        let record = client.get_unlocked(&player, &first).unwrap();
        assert_eq!(record.player, player);
        assert_eq!(record.nonce, 1);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #6)")]
    fn test_duplicate_achievement_claim_fails() {
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        define_achievement(&env, &client, "first");
        let first = Symbol::new(&env, "first");
        client.unlock(&player, &first, &1);
        client.unlock(&player, &first, &2);
    }

    #[test]
    #[should_panic]
    fn define_admin_only_enforced() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(AchievementsContract, ());
        let client = AchievementsContractClient::new(&env, &contract_id);
        client.init(&admin);
        client.define(&Symbol::new(&env, "x"), &Symbol::new(&env, "y"), &1, &true);
    }

    #[test]
    fn event_topics_match_fixtures() {
        assert_eq!(fixtures::TOPIC_ACHIEVEMENT_DEFINED, "achievement_defined");
        assert_eq!(fixtures::TOPIC_ACHIEVEMENT_UNLOCKED, "achievement_unlocked");
    }

    #[test]
    fn unlocked_count_tracks_distinct_unlocks() {
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        let player = Address::generate(&env);
        assert_eq!(client.get_unlocked_count(&player), 0);
        define_achievement(&env, &client, "a");
        define_achievement(&env, &client, "b");
        client.unlock(&player, &Symbol::new(&env, "a"), &1);
        client.unlock(&player, &Symbol::new(&env, "b"), &2);
        assert_eq!(client.get_unlocked_count(&player), 2);
        // Other players are unaffected.
        assert_eq!(client.get_unlocked_count(&Address::generate(&env)), 0);
    }

    #[test]
    fn redefining_emits_definition_updated_event() {
        use soroban_sdk::{testutils::Events, IntoVal, Val, Vec as SorobanVec};
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        define_achievement(&env, &client, "a");
        client.define(
            &Symbol::new(&env, "a"),
            &Symbol::new(&env, "streak"),
            &9,
            &false,
        );
        let events = env.events().all();
        let (_, topics, data) = events.last().unwrap();
        let expected_topics: SorobanVec<Val> = (
            Symbol::new(&env, "achievement"),
            Symbol::new(&env, "definition_updated"),
            Symbol::new(&env, "a"),
        )
            .into_val(&env);
        assert_eq!(topics, expected_topics);
        let expected_data: Val = (9u32, Symbol::new(&env, "streak"), false).into_val(&env);
        assert_eq!(data, expected_data);
    }

    #[test]
    fn first_definition_does_not_emit_definition_updated() {
        use soroban_sdk::{testutils::Events, IntoVal, Val, Vec as SorobanVec};
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        define_achievement(&env, &client, "a");
        let updated: SorobanVec<Val> = (
            Symbol::new(&env, "achievement"),
            Symbol::new(&env, "definition_updated"),
            Symbol::new(&env, "a"),
        )
            .into_val(&env);
        assert!(env.events().all().iter().all(|(_, t, _)| t != updated));
    }
}
