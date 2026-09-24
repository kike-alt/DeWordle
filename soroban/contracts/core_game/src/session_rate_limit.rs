use soroban_sdk::{contracterror, Address, Env};

const MIN_INTERVAL_SECONDS: u64 = 10;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RateLimitError {
    RateLimitExceeded = 1,
}

/// Enforces a minimum delay between session-creation calls per player.
pub fn check_and_record(env: &Env, player: &Address) -> Result<(), RateLimitError> {
    let now = env.ledger().timestamp();

    if let Some(last) = env.storage().temporary().get::<Address, u64>(player) {
        if now.saturating_sub(last) < MIN_INTERVAL_SECONDS {
            return Err(RateLimitError::RateLimitExceeded);
        }
    }

    env.storage().temporary().set(player, &now);
    Ok(())
}
