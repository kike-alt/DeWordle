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
