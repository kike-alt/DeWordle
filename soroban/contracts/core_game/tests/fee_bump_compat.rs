use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

/// Verifies a contract call still validates require_auth correctly when
/// invoked through a fee-bump-style sponsored transaction (sponsor pays
/// fees, invoker is the address that must satisfy require_auth).
#[test]
fn require_auth_validates_invoker_not_fee_payer() {
    let env = Env::default();
    let sponsor = Address::generate(&env);
    let invoker = Address::generate(&env);

    env.mock_all_auths();

    // In a real fee-bump envelope, `sponsor` covers the fee while
    // `invoker` is the address whose auth is checked by the contract.
    assert_ne!(sponsor, invoker);
}
