import type { Meta, StoryObj } from "@storybook/react";
import { SessionResultCard } from "./SessionResultCard";
import type { SessionResultData } from "./SessionResultCard";

const meta = {
  title: "Game/SessionResultCard",
  component: SessionResultCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SessionResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const dailyWon: SessionResultData = {
  kind: "daily",
  word: "REACT",
  won: true,
  guessCount: 4,
  streak: 7,
  sessionId: "sess_abc123def456",
  txHash: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  date: "2026-07-25",
};

const dailyLost: SessionResultData = {
  kind: "daily",
  word: "STELLAR",
  won: false,
  guessCount: 6,
  streak: 0,
  sessionId: "sess_xyz789",
  date: "2026-07-24",
};

const practiceWon: SessionResultData = {
  kind: "practice",
  word: "BLOCK",
  won: true,
  guessCount: 2,
  streak: 0,
};

const interrupted: SessionResultData = {
  kind: "interrupted",
  word: "",
  won: false,
  guessCount: 3,
  streak: 0,
};

export const DailyWon: Story = {
  args: {
    result: dailyWon,
  },
};

export const DailyLost: Story = {
  args: {
    result: dailyLost,
  },
};

export const PracticeWon: Story = {
  args: {
    result: practiceWon,
  },
};

export const Interrupted: Story = {
  args: {
    result: interrupted,
  },
};

export const WithShareCallback: Story = {
  args: {
    result: dailyWon,
    onShare: (text: string) => {
      console.log("Share text:", text);
    },
  },
};
