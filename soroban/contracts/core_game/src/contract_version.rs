use soroban_sdk::Env;

const VERSION: (u32, u32, u32) = (0, 1, 0);

/// Returns (major, minor, patch) matching this crate's Cargo.toml version.
pub fn get_contract_version(_env: &Env) -> (u32, u32, u32) {
    VERSION
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn returns_static_version_tuple() {
        let env = Env::default();
        assert_eq!(get_contract_version(&env), VERSION);
    }
}
