"use client";

import { useCallback, useContext } from "react";
import {
  OnboardingContext,
  type OnboardingStep,
} from "@/providers/onboarding-provider";

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }

  const { currentStep, setCurrentStep, isComplete, setComplete, restart } =
    context;

  const steps: OnboardingStep[] = [
    "welcome",
    "wallet-connect",
    "first-game",
    "rewards-overview",
  ];

  const nextStep = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1]);
    } else {
      setComplete(true);
    }
  }, [currentStep, setCurrentStep, setComplete]);

  const prevStep = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(steps[idx - 1]);
    }
  }, [currentStep, setCurrentStep]);

  const skip = useCallback(() => {
    setComplete(true);
  }, [setComplete]);

  return {
    currentStep,
    steps,
    isComplete,
    nextStep,
    prevStep,
    skip,
    restart,
  };
}
