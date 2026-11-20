import { afterEach, describe, expect, it } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { SessionRecoveryToast } from "./SessionRecoveryToast";
import { clearToasts, useToastStore } from "@/store/useToastStore";

describe("SessionRecoveryToast", () => {
  afterEach(() => {
    window.localStorage.clear();
    clearToasts();
  });

  it("announces restored guesses for an active session", () => {
    window.localStorage.setItem(
      "dewordle_offline_session",
      JSON.stringify({ status: "active", guesses: ["CRANE", "SLOTH"] }),
    );
    const { result } = renderHook(() => useToastStore());

    render(<SessionRecoveryToast />);

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      message: "Resumed previous session: 2 guesses restored",
      durationMs: 4000,
    });
  });

  it("does not announce sessions without restored guesses", () => {
    window.localStorage.setItem(
      "dewordle_offline_session",
      JSON.stringify({ status: "active", guesses: [] }),
    );
    const { result } = renderHook(() => useToastStore());

    render(<SessionRecoveryToast />);

    expect(result.current).toHaveLength(0);
  });
});
