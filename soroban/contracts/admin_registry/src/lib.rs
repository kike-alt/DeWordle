#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, Symbol,
};

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Contract(Symbol),
    Role(Symbol, Address),
}

#[derive(Clone)]
#[contracterror]
#[repr(u32)]
pub enum AdminRegistryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    MissingContract = 4,
}

#[contract]
pub struct AdminRegistryContract;

#[contractimpl]
impl AdminRegistryContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, AdminRegistryError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.events().publish((Symbol::new(&env, "registry_initialized"),), admin);
    }

    pub fn set_contract(env: Env, key: Symbol, contract_address: Address) {
        Self::require_admin(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Contract(key.clone()), &contract_address);
        env.events().publish((Symbol::new(&env, "contract_set"), key), contract_address);
    }

    pub fn get_contract(env: Env, key: Symbol) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Contract(key))
            .unwrap_or_else(|| panic_with_error!(&env, AdminRegistryError::MissingContract))
    }

    pub fn set_role(env: Env, role: Symbol, member: Address, enabled: bool) {
        Self::require_admin(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Role(role.clone(), member.clone()), &enabled);
        env.events().publish((Symbol::new(&env, "role_set"), role, member), enabled);
    }

    pub fn has_role(env: Env, role: Symbol, member: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Role(role, member))
            .unwrap_or(false)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(&env, AdminRegistryError::NotInitialized))
    }

    pub fn version(env: Env) -> u32 {
        env.events().publish(
            (Symbol::new(&env, "module"), Symbol::new(&env, "admin_registry")),
            2u32,
        );
        2
    }

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(env, AdminRegistryError::NotInitialized));
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
        let contract_id = env.register(AdminRegistryContract, ());
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        client.init(&admin);
        (env, admin, contract_id)
    }

    #[test]
    fn init_sets_admin() {
        let (env, admin, contract_id) = setup();
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic]
    fn double_init_panics() {
        let (env, admin, contract_id) = setup();
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        client.init(&admin);
    }

    #[test]
    fn set_and_get_contract() {
        let (env, _, contract_id) = setup();
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        let contract_addr = Address::generate(&env);
        let key = Symbol::new(&env, "core_game");

        client.set_contract(&key, &contract_addr);
        let retrieved = client.get_contract(&key);
        assert_eq!(retrieved, contract_addr);
    }

    #[test]
    #[should_panic]
    fn get_contract_missing_panics() {
        let (env, _, contract_id) = setup();
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        let missing = Symbol::new(&env, "missing");
        client.get_contract(&missing);
    }

    #[test]
    fn set_and_check_role() {
        let (env, _, contract_id) = setup();
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        let member = Address::generate(&env);
        let role = Symbol::new(&env, "pauser");

        assert!(!client.has_role(&role, &member));
        client.set_role(&role, &member, &true);
        assert!(client.has_role(&role, &member));
        client.set_role(&role, &member, &false);
        assert!(!client.has_role(&role, &member));
    }

    #[test]
    fn get_admin_returns_initialized_admin() {
        let (env, admin, contract_id) = setup();
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic]
    fn get_admin_before_init_panics() {
        let env = Env::default();
        let contract_id = env.register(AdminRegistryContract, ());
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        client.get_admin();
    }
}
