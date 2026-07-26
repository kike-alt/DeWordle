/**
 * Env-driven feature flags for incomplete surfaces.
 * Set NEXT_PUBLIC_FEATURE_REWARDS=true or NEXT_PUBLIC_FEATURE_ACHIEVEMENTS=true
 * to enable the respective route.
 */
export const FEATURE_FLAGS = {
  rewards: process.env.NEXT_PUBLIC_FEATURE_REWARDS === "true",
  achievements: process.env.NEXT_PUBLIC_FEATURE_ACHIEVEMENTS === "true",
} as const;
