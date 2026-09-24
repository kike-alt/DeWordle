use soroban_sdk::{contracterror, contracttype, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlayerStats {
    pub games_played: u32,
    pub wins: u32,
    pub current_streak: u32,
    pub tokens_earned: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum StatsError {
    NotFound = 1,
}

pub fn get_player_stats(env: &Env, player: Address) -> Result<PlayerStats, StatsError> {
    Ok(env
        .storage()
        .persistent()
        .get::<Address, PlayerStats>(&player)
        .unwrap_or(PlayerStats {
            games_played: 0,
            wins: 0,
            current_streak: 0,
            tokens_earned: 0,
        }))
}
