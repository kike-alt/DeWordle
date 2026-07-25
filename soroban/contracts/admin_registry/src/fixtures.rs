//! Canonical event fixture definitions for admin_registry contract.

/// Event: registry_initialized
/// topic: ("registry_initialized",)
/// payload: admin: Address
pub const TOPIC_REGISTRY_INITIALIZED: &str = "registry_initialized";

/// Event: contract_set
/// topic: ("contract_set", key: Symbol)
/// payload: contract_address: Address
pub const TOPIC_CONTRACT_SET: &str = "contract_set";

/// Event: role_set
/// topic: ("role_set", role: Symbol, member: Address)
/// payload: enabled: bool
pub const TOPIC_ROLE_SET: &str = "role_set";
