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
    /// Category of a definition, stored separately so definitions written
    /// before categories existed still decode (they read as `general`).
    Category(Symbol),
    /// Number of distinct achievements ever defined.
    Count,
}

/// Category reported for definitions stored without one.
const DEFAULT_CATEGORY: &str = "general";

/// Shape persisted under `DataKey::Definition` (unchanged from before
/// categories were added, so existing entries remain readable).
#[derive(Clone)]
#[contracttype]
struct StoredDefinition {
    id: Symbol,
    metric: Symbol,
    threshold: u32,
    enabled: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct AchievementDefinition {
    pub id: Symbol,
    pub metric: Symbol,
    pub threshold: u32,
    pub enabled: bool,
    /// Grouping such as `streak`, `speed` or `loyalty`; `general` by default.
    pub category: Symbol,
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
    abi_descriptor: "define\nget_achievement_count\nget_definition\nget_metadata\nget_spec_metadata\nget_unlocked\ninit\nunlock\nupdate_metadata\nversion",
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

    pub fn define(
        env: Env,
        id: Symbol,
        metric: Symbol,
        threshold: u32,
        enabled: bool,
        category: Symbol,
    ) {
        Self::require_admin(&env);
        let is_new = !env
            .storage()
            .persistent()
            .has(&DataKey::Definition(id.clone()));
        let stored = StoredDefinition {
            id: id.clone(),
            metric: metric.clone(),
            threshold,
            enabled,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Definition(id.clone()), &stored);
        env.storage()
            .persistent()
            .set(&DataKey::Category(id.clone()), &category);
        if is_new {
            let count: u32 = env.storage().instance().get(&DataKey::Count).unwrap_or(0);
            env.storage().instance().set(&DataKey::Count, &(count + 1));
        }
        let def = AchievementDefinition {
            id: id.clone(),
            metric,
            threshold,
            enabled,
            category,
        };
        env.events().publish((Symbol::new(&env, "achievement_defined"), id), def);
    }

    /// Number of distinct achievements defined. Redefining an existing id
    /// does not change it.
    pub fn get_achievement_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Count).unwrap_or(0)
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
        let stored: StoredDefinition = env
            .storage()
            .persistent()
            .get(&DataKey::Definition(id.clone()))?;
        let category: Symbol = env
            .storage()
            .persistent()
            .get(&DataKey::Category(id))
            .unwrap_or_else(|| Symbol::new(&env, DEFAULT_CATEGORY));
        Some(AchievementDefinition {
            id: stored.id,
            metric: stored.metric,
            threshold: stored.threshold,
            enabled: stored.enabled,
            category,
        })
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
            3u32,
        );
        3
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
        client.define(
            &Symbol::new(env, id),
            &Symbol::new(env, "streak"),
            &5,
            &true,
            &Symbol::new(env, "streak"),
        );
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
        client.define(
            &Symbol::new(&env, "x"),
            &Symbol::new(&env, "y"),
            &1,
            &true,
            &Symbol::new(&env, "general"),
        );
    }

    #[test]
    fn event_topics_match_fixtures() {
        assert_eq!(fixtures::TOPIC_ACHIEVEMENT_DEFINED, "achievement_defined");
        assert_eq!(fixtures::TOPIC_ACHIEVEMENT_UNLOCKED, "achievement_unlocked");
    }

    #[test]
    fn definition_carries_its_category() {
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        client.define(
            &Symbol::new(&env, "fast"),
            &Symbol::new(&env, "time"),
            &30,
            &true,
            &Symbol::new(&env, "speed"),
        );
        let def = client.get_definition(&Symbol::new(&env, "fast")).unwrap();
        assert_eq!(def.category, Symbol::new(&env, "speed"));
    }

    #[test]
    fn legacy_definition_without_category_reads_as_general() {
        let (env, _, contract_id) = setup();
        let id = Symbol::new(&env, "old");
        env.as_contract(&contract_id, || {
            env.storage().persistent().set(
                &DataKey::Definition(id.clone()),
                &StoredDefinition {
                    id: id.clone(),
                    metric: Symbol::new(&env, "wins"),
                    threshold: 1,
                    enabled: true,
                },
            );
        });
        let client = AchievementsContractClient::new(&env, &contract_id);
        let def = client.get_definition(&id).unwrap();
        assert_eq!(def.category, Symbol::new(&env, "general"));
    }

    #[test]
    fn achievement_count_counts_unique_definitions_only() {
        let (env, _, contract_id) = setup();
        let client = AchievementsContractClient::new(&env, &contract_id);
        assert_eq!(client.get_achievement_count(), 0);
        define_achievement(&env, &client, "a");
        define_achievement(&env, &client, "b");
        define_achievement(&env, &client, "c");
        assert_eq!(client.get_achievement_count(), 3);
        // Redefining an existing id does not increment.
        define_achievement(&env, &client, "b");
        assert_eq!(client.get_achievement_count(), 3);
    }
}
