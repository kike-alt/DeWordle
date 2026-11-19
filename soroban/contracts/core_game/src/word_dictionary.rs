use soroban_sdk::{symbol_short, Address, BytesN, Env, Map};

/// Maps word length (4-8) to the active Merkle root for that word set.
pub fn set_word_dictionary_root(env: &Env, caller: &Address, word_len: u32, merkle_root: BytesN<32>) {
    caller.require_auth();

    let key = symbol_short!("DICTROOT");
    let mut roots: Map<u32, BytesN<32>> = env
        .storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| Map::new(env));

    roots.set(word_len, merkle_root.clone());
    env.storage().instance().set(&key, &roots);

    env.events()
        .publish((symbol_short!("dictupd"), word_len), merkle_root);
}

/// Shortest and longest supported word lengths (inclusive).
pub const MIN_WORD_LEN: u32 = 4;
pub const MAX_WORD_LEN: u32 = 8;

/// Returns the registered Merkle root for `word_len`, or `None` when no root
/// was registered or the length is outside 4..=8.
pub fn get_word_dictionary_root(env: &Env, word_len: u32) -> Option<BytesN<32>> {
    if !(MIN_WORD_LEN..=MAX_WORD_LEN).contains(&word_len) {
        return None;
    }
    let roots: Map<u32, BytesN<32>> = env.storage().instance().get(&symbol_short!("DICTROOT"))?;
    roots.get(word_len)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::CoreGameContract;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn getter_returns_the_exact_root_the_setter_stored() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(CoreGameContract, ());
        let admin = Address::generate(&env);
        let root = BytesN::from_array(&env, &[7u8; 32]);
        env.as_contract(&id, || {
            set_word_dictionary_root(&env, &admin, 5, root.clone());
            assert_eq!(get_word_dictionary_root(&env, 5), Some(root));
            // A length with no registered root is None.
            assert_eq!(get_word_dictionary_root(&env, 6), None);
        });
    }

    #[test]
    fn unsupported_lengths_return_none() {
        let env = Env::default();
        let id = env.register(CoreGameContract, ());
        env.as_contract(&id, || {
            assert_eq!(get_word_dictionary_root(&env, 3), None);
            assert_eq!(get_word_dictionary_root(&env, 9), None);
        });
    }
}
