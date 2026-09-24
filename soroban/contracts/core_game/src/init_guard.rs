use soroban_sdk::{contracterror, symbol_short, Env};

const ADMIN_KEY: soroban_sdk::Symbol = symbol_short!("ADMIN");

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum InitError {
    AlreadyInitialized = 1,
}

/// Guards initialize() so it can only run once per contract instance.
pub fn ensure_not_initialized(env: &Env) -> Result<(), InitError> {
    if env.storage().instance().has(&ADMIN_KEY) {
        return Err(InitError::AlreadyInitialized);
    }
    Ok(())
}

pub fn mark_initialized(env: &Env, admin: &soroban_sdk::Address) {
    env.storage().instance().set(&ADMIN_KEY, admin);
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Address;

    #[test]
    fn rejects_double_initialization() {
        let env = Env::default();
        env.as_contract(&env.register_contract(None, crate::CoreGame), || {
            let admin = Address::generate(&env);
            assert!(ensure_not_initialized(&env).is_ok());
            mark_initialized(&env, &admin);
            assert_eq!(ensure_not_initialized(&env), Err(InitError::AlreadyInitialized));
        });
    }
}
