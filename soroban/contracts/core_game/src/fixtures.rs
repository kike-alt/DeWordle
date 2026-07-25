//! Canonical event fixture definitions for core_game contract.
//! These fixtures document the expected event topic/payload shapes.

/// Event: session_started
/// topic: ("session_started", player: Address, day_id: u32)
/// payload: session_id: BytesN<32>
pub const TOPIC_SESSION_STARTED: &str = "session_started";

/// Event: guess_submitted
/// topic: ("guess_submitted", session_id: BytesN<32>)
/// payload: (guess_commitment: BytesN<32>, result: GuessResult)
pub const TOPIC_GUESS_SUBMITTED: &str = "guess_submitted";

/// Event: session_finalized
/// topic: ("session_finalized", session_id: BytesN<32>)
/// payload: player: Address
pub const TOPIC_SESSION_FINALIZED: &str = "session_finalized";

/// Event: day_published
/// topic: ("day_published", day_id: u32)
/// payload: DayConfig
pub const TOPIC_DAY_PUBLISHED: &str = "day_published";

/// Event: streak_updated
/// topic: ("streak_updated", player: Address)
/// payload: PlayerStreak
pub const TOPIC_STREAK_UPDATED: &str = "streak_updated";

/// Event: core_game_paused
/// topic: ("core_game_paused",)
/// payload: bool
pub const TOPIC_CORE_GAME_PAUSED: &str = "core_game_paused";

/// Event: core_game_initialized
/// topic: ("core_game_initialized",)
/// payload: admin: Address
pub const TOPIC_CORE_GAME_INITIALIZED: &str = "core_game_initialized";
