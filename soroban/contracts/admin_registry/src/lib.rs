#![no_std]

use dewordle_utils::metadata::{self, ContractMetadata, MetadataDefaults};
use soroban_sdk::{BytesN, 
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, Symbol,
};

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Contract(Symbol),
    Role(Symbol, Address),
    /// WASM hash staged for a contract key but not yet applied.
    UpgradeProposal(Symbol),
}

#[derive(Clone)]
#[contracterror]
#[repr(u32)]
pub enum AdminRegistryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    MissingContract = 4,
    AuthorizationFailed = 5,
    /// The address is the all-zero account or contract address.
    InvalidAddress = 6,
}

/// StrKey of the all-zero ed25519 account and the all-zero contract id.
const ZERO_ACCOUNT_ADDRESS: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const ZERO_CONTRACT_ADDRESS: &str = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

/// Rejects the zero/dummy account and contract addresses so they can never be
/// stored as a registered contract or role member.
pub fn validate_address(env: &Env, address: &Address) {
    let text = address.to_string();
    if text == soroban_sdk::String::from_str(env, ZERO_ACCOUNT_ADDRESS)
        || text == soroban_sdk::String::from_str(env, ZERO_CONTRACT_ADDRESS)
    {
        panic_with_error!(env, AdminRegistryError::InvalidAddress);
    }
}

/// Names of the public entrypoints; hashed into `get_metadata().abi_hash`.
/// Update this list (and bump the version) whenever the public ABI changes.
const METADATA_DEFAULTS: MetadataDefaults = MetadataDefaults {
    version: 3,
    abi_descriptor: "get_admin\nget_contract\nget_metadata\nget_upgrade_proposal\nhas_role\ninit\nset_contract\nset_role\nstage_upgrade\nupdate_metadata\nverify_authorized\nversion",
    min_sdk_version: "0.1.0",
};

#[contract]
pub struct AdminRegistryContract;

#[contractimpl]
impl AdminRegistryContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, AdminRegistryError::AlreadyInitialized);
        }
        // Validate admin address is not simple empty/nil representation
        let admin_str = soroban_sdk::String::from_str(&env, "nil");
        env.storage().instance().set(&DataKey::Admin, &admin);
        metadata::store_defaults(&env, &METADATA_DEFAULTS);
        env.events().publish((Symbol::new(&env, "registry_initialized"),), admin);
    }

    pub fn set_contract(env: Env, key: Symbol, contract_address: Address) {
        Self::require_admin(&env);
        validate_address(&env, &contract_address);
        env.storage()
            .persistent()
            .set(&DataKey::Contract(key.clone()), &contract_address);
        env.events().publish((Symbol::new(&env, "contract_set"), key), contract_address);
    }

    /// Admin-only: stages a WASM hash for `contract_key` so the pending
    /// upgrade can be inspected before it is applied.
    pub fn stage_upgrade(env: Env, contract_key: Symbol, wasm_hash: BytesN<32>) {
        Self::require_admin(&env);
        env.storage()
            .persistent()
            .set(&DataKey::UpgradeProposal(contract_key.clone()), &wasm_hash);
        env.events()
            .publish((Symbol::new(&env, "upgrade_staged"), contract_key), wasm_hash);
    }

    /// The pending WASM hash staged for `contract_key`, or `None`.
    pub fn get_upgrade_proposal(env: Env, contract_key: Symbol) -> Option<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::UpgradeProposal(contract_key))
    }

    pub fn get_contract(env: Env, key: Symbol) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Contract(key))
            .unwrap_or_else(|| panic_with_error!(&env, AdminRegistryError::MissingContract))
    }

    pub fn set_role(env: Env, role: Symbol, member: Address, enabled: bool) {
        Self::require_admin(&env);
        validate_address(&env, &member);
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
            (Symbol::new(&env, "module"), Symbol::new(&env, "admin_registry")),
            3u32,
        );
        3
    }

    pub fn verify_authorized(env: Env, caller: Address) -> Result<(), AdminRegistryError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(&env, AdminRegistryError::NotInitialized));
        if caller != admin {
            return Err(AdminRegistryError::AuthorizationFailed);
        }
        Ok(())
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

    #[test]
    fn upgrade_proposal_is_none_until_staged_then_returned() {
        let (env, _, contract_id) = setup();
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        let key = Symbol::new(&env, "core_game");
        assert_eq!(client.get_upgrade_proposal(&key), None);
        let hash = BytesN::from_array(&env, &[9u8; 32]);
        client.stage_upgrade(&key, &hash);
        assert_eq!(client.get_upgrade_proposal(&key), Some(hash));
        // Other keys are unaffected.
        assert_eq!(client.get_upgrade_proposal(&Symbol::new(&env, "rewards")), None);
    }

    #[test]
    #[should_panic]
    fn staging_an_upgrade_requires_admin_auth() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(AdminRegistryContract, ());
        let client = AdminRegistryContractClient::new(&env, &contract_id);
        client.init(&admin);
        client.stage_upgrade(&Symbol::new(&env, "core_game"), &BytesN::from_array(&env, &[1u8; 32]));
    }
}
