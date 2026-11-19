//! All four contracts must advertise the same release number and minimum SDK
//! version, so SDK clients can run a single compatibility check.

use achievements::{AchievementsContract, AchievementsContractClient};
use admin_registry::{AdminRegistryContract, AdminRegistryContractClient};
use core_game::{CoreGameContract, CoreGameContractClient};
use rewards::{RewardsContract, RewardsContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

#[test]
fn contract_metadata_versions_match_across_contracts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);

    let core = CoreGameContractClient::new(&env, &env.register(CoreGameContract, ()));
    let rewards = RewardsContractClient::new(&env, &env.register(RewardsContract, ()));
    let achievements =
        AchievementsContractClient::new(&env, &env.register(AchievementsContract, ()));
    let registry = AdminRegistryContractClient::new(&env, &env.register(AdminRegistryContract, ()));

    core.init(&admin);
    rewards.init(&admin);
    achievements.init(&admin);
    registry.init(&admin);

    let core_meta = core.get_metadata();
    for (name, version, min_sdk) in [
        ("rewards", rewards.get_metadata().version, rewards.get_metadata().min_sdk_version),
        (
            "achievements",
            achievements.get_metadata().version,
            achievements.get_metadata().min_sdk_version,
        ),
        (
            "admin_registry",
            registry.get_metadata().version,
            registry.get_metadata().min_sdk_version,
        ),
    ] {
        assert_eq!(version, core_meta.version, "{name} metadata version differs from core_game");
        assert_eq!(min_sdk, core_meta.min_sdk_version, "{name} min_sdk_version differs from core_game");
    }

    // `version()` must agree with the metadata too.
    assert_eq!(core.version(), core_meta.version);
    assert_eq!(rewards.version(), core_meta.version);
    assert_eq!(achievements.version(), core_meta.version);
    assert_eq!(registry.version(), core_meta.version);
}
