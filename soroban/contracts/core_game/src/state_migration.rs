use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone, Debug)]
pub struct ContractStateDump {
    pub admin: Address,
    pub version: (u32, u32, u32),
}

pub fn export_contract_state(env: &Env, admin: &Address) -> ContractStateDump {
    admin.require_auth();
    ContractStateDump {
        admin: admin.clone(),
        version: crate::contract_version::get_contract_version(env),
    }
}

pub fn import_contract_state(env: &Env, admin: &Address, state: ContractStateDump) {
    admin.require_auth();
    env.storage().instance().set(&soroban_sdk::symbol_short!("ADMIN"), &state.admin);
}
