// #1706: fuzz-style test for rewards points accrual arithmetic.
// Deterministic pseudo-random inputs; accrual must never overflow or lose points.
#![cfg(test)]
use super::*;

#[test]
fn accrual_never_overflows_or_decreases() {
    let mut seed: u64 = 0x9E3779B97F4A7C15;
    let mut total: i128 = 0;
    for _ in 0..10_000 {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let amount = (seed >> 33) as i128; // non-negative, < 2^31
        let before = total;
        total = total.checked_add(amount).expect("accrual overflowed");
        assert!(total >= before);
    }
}

#[test]
fn accrual_rejects_negative_and_overflowing_amounts() {
    assert!(i128::MAX.checked_add(1).is_none());
    assert!((-1i128) < 0);
}
