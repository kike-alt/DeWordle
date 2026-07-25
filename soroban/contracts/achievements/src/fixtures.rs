//! Canonical event fixture definitions for achievements contract.

/// Event: achievements_initialized
/// topic: ("achievements_initialized",)
/// payload: admin: Address
pub const TOPIC_ACHIEVEMENTS_INITIALIZED: &str = "achievements_initialized";

/// Event: achievement_defined
/// topic: ("achievement_defined", id: Symbol)
/// payload: AchievementDefinition
pub const TOPIC_ACHIEVEMENT_DEFINED: &str = "achievement_defined";

/// Event: achievement_unlocked
/// topic: ("achievement_unlocked", player: Address, id: Symbol)
/// payload: AchievementUnlock
pub const TOPIC_ACHIEVEMENT_UNLOCKED: &str = "achievement_unlocked";
