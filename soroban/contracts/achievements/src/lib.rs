#![no_std]

pub mod fixtures;

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, Symbol,
};

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Definition(Symbol),
    Unlocked(Address, Symbol),
    UnlockNonce(Address, u64),
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
}

#[contract]
pub struct AchievementsContract;

#[contractimpl]
impl AchievementsContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, AchievementsError::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.events().publish((Symbol::new(&env, "achievements_initialized"),), admin);
    }

    pub fn define(env: Env, id: Symbol, metric: Symbol, threshold: u32, enabled: bool) {
        Self::require_admin(&env);
        let def = AchievementDefinition {
            id: id.clone(),
            metric,
            threshold,
            enabled,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Definition(id.clone()), &def);
        env.events().publish((Symbol::new(&env, "achievement_defined"), id), def);
    }

    pub fn unlock(env: Env, player: Address, id: Symbol, nonce: u64) {
        Self::require_admin(&env);

        if !env.storage().persistent().has(&DataKey::Definition(id.clone())) {
            panic_with_error!(&env, AchievementsError::DefinitionNotFound);
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

        env.events()
            .publish((Symbol::new(&env, "achievement_unlocked"), player, id), unlock);
    }

    pub fn get_definition(env: Env, id: Symbol) -> Option<AchievementDefinition> {
        env.storage().persistent().get(&DataKey::Definition(id))
    }

    pub fn get_unlocked(env: Env, player: Address, id: Symbol) -> Option<AchievementUnlock> {
        env.storage().persistent().get(&DataKey::Unlocked(player, id))
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
}
