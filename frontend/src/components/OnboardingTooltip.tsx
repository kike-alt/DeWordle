"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { X, ArrowRight, ArrowLeft, HelpCircle } from "lucide-react";

const STEP_CONFIG: Record<
  string,
  { title: string; body: string; highlight?: string }
> = {
  welcome: {
    title: "Welcome to DeWordle",
    body: "A decentralized word game built on Stellar. Guess the word in six tries, compete on-chain, and earn rewards.",
    highlight: "hero",
  },
  "wallet-connect": {
    title: "Connect Your Wallet",
    body: "Click the 'Login / Sign up' button in the header to connect your Stellar wallet. This is how you play and track your progress.",
    highlight: "header",
  },
  "first-game": {
    title: "Play Your First Game",
    body: "Type a five-letter word and press Enter. Tiles will change color to show which letters are correct. Green = right letter, right spot. Yellow = right letter, wrong spot.",
    highlight: "game-board",
  },
  "rewards-overview": {
    title: "Earn Rewards",
    body: "Complete games and achievements to earn rewards. Track your progress in the Rewards and Achievements sections.",
    highlight: "rewards",
  },
};

export function OnboardingTooltip() {
  const { currentStep, isComplete, steps, nextStep, prevStep, skip } =
    useOnboarding();

  if (isComplete) return null;

  const config = STEP_CONFIG[currentStep];
  const stepIndex = steps.indexOf(currentStep);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-dark-200 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20">
                <HelpCircle className="h-4 w-4 text-primary-400" />
              </div>
              <h2 className="font-clash text-lg font-semibold text-white">
                {config.title}
              </h2>
              <button
                onClick={skip}
                aria-label="Skip onboarding"
                className="ml-auto rounded-lg p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mb-6">
              {config.body}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === stepIndex
                        ? "w-6 bg-primary-400"
                        : i < stepIndex
                          ? "w-1.5 bg-primary-600"
                          : "w-1.5 bg-gray-600"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  {stepIndex === steps.length - 1 ? "Get Started" : "Next"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
