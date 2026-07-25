"use client";

import dynamic from "next/dynamic";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { ComingSoon } from "@/components/ComingSoon";
import { AchievementsSkeleton } from "@/components/skeletons";

const AchievementsView = dynamic(
  () => import("@/components/AchievementsView").then((m) => m.AchievementsView),
  {
    loading: () => <AchievementsSkeleton />,
    ssr: false,
  }
);

export default function AchievementsPage() {
  if (!FEATURE_FLAGS.achievements) return <ComingSoon feature="Achievements" />;
  return <AchievementsView />;
}
