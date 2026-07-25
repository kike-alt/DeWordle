"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type OnboardingStep =
  | "welcome"
  | "wallet-connect"
  | "first-game"
  | "rewards-overview";

const STORAGE_KEY_ONBOARDING_COMPLETE = "onboarding_complete";
const STORAGE_KEY_ONBOARDING_STEP = "onboarding_step";

interface OnboardingState {
  currentStep: OnboardingStep;
  isComplete: boolean;
}

interface OnboardingContextType extends OnboardingState {
  setCurrentStep: (step: OnboardingStep) => void;
  setComplete: (complete: boolean) => void;
  restart: () => void;
}

export const OnboardingContext = createContext<
  OnboardingContextType | undefined
>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    currentStep: "welcome",
    isComplete: true,
  });

  useEffect(() => {
    try {
      const complete = localStorage.getItem(STORAGE_KEY_ONBOARDING_COMPLETE);
      if (complete === "true") {
        setState((prev) => ({ ...prev, isComplete: true }));
      } else {
        const savedStep = localStorage.getItem(
          STORAGE_KEY_ONBOARDING_STEP,
        ) as OnboardingStep | null;
        setState({
          currentStep: savedStep || "welcome",
          isComplete: false,
        });
      }
    } catch {
      setState((prev) => ({ ...prev, isComplete: true }));
    }
  }, []);

  const setCurrentStep = useCallback((step: OnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
    try {
      localStorage.setItem(STORAGE_KEY_ONBOARDING_STEP, step);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setComplete = useCallback((complete: boolean) => {
    setState((prev) => ({ ...prev, isComplete: complete }));
    try {
      localStorage.setItem(STORAGE_KEY_ONBOARDING_COMPLETE, String(complete));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const restart = useCallback(() => {
    setState({ currentStep: "welcome", isComplete: false });
    try {
      localStorage.removeItem(STORAGE_KEY_ONBOARDING_COMPLETE);
      localStorage.setItem(STORAGE_KEY_ONBOARDING_STEP, "welcome");
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        ...state,
        setCurrentStep,
        setComplete,
        restart,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
