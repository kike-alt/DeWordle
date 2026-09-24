use soroban_sdk::{contracterror, symbol_short, Env};

const SECONDS_PER_DAY: u64 = 86_400;
const MAX_DAILY_PAYOUT_AMOUNT: i128 = 1_000_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RewardError {
    DailyCapExceeded = 1,
}

struct PayoutWindow {
    total: i128,
    window_start: u64,
}

pub fn record_payout(env: &Env, amount: i128) -> Result<(), RewardError> {
    let key = symbol_short!("PAYOUT");
    let now = env.ledger().timestamp();

    let mut window: (i128, u64) = env.storage().instance().get(&key).unwrap_or((0, now));

    if now.saturating_sub(window.1) >= SECONDS_PER_DAY {
        window = (0, now);
    }

    if window.0 + amount > MAX_DAILY_PAYOUT_AMOUNT {
        return Err(RewardError::DailyCapExceeded);
    }

    window.0 += amount;
    env.storage().instance().set(&key, &window);
    Ok(())
}
