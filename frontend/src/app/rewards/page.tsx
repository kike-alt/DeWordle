"use client";

import dynamic from "next/dynamic";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { ComingSoon } from "@/components/ComingSoon";
import { RewardsSkeleton } from "@/components/skeletons";

const RewardsClaimPanel = dynamic(
  () => import("@/components/RewardsClaimPanel").then((m) => m.RewardsClaimPanel),
  {
    loading: () => <RewardsSkeleton />,
    ssr: false,
  }
);

export default function RewardsPage() {
  if (!FEATURE_FLAGS.rewards) return <ComingSoon feature="Rewards" />;

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-10">
      <RewardsClaimPanel rewards={[]} />
    </section>
  );
}
