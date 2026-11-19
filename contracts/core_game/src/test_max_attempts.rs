// #1705: boundary test for the maximum attempts limit in core_game.
// Assumes the contract exposes MAX_ATTEMPTS and a submit_guess entrypoint.
#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn max_attempts_boundary() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CoreGameContract, ());
    let client = CoreGameContractClient::new(&env, &contract_id);
    let player = Address::generate(&env);

    let session = client.start_session(&player);
    // Attempts up to and including the limit succeed.
    for _ in 0..MAX_ATTEMPTS {
        client.submit_guess(&player, &session, &soroban_sdk::symbol_short!("wrong"));
    }
    // One past the limit must fail.
    assert!(client.try_submit_guess(&player, &session, &soroban_sdk::symbol_short!("wrong")).is_err());
}
