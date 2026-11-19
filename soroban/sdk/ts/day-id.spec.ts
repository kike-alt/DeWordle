import { afterEach, describe, expect, it, vi } from "vitest";
import { getDateFromDayId, getDayIdFromDate } from "./types";

afterEach(() => vi.useRealTimers());

describe("day id helpers", () => {
  it("maps the epoch to day 0 and the next UTC midnight to day 1", () => {
    expect(getDayIdFromDate(new Date("1970-01-01T00:00:00Z"))).toBe(0);
    expect(getDayIdFromDate(new Date("1970-01-01T23:59:59.999Z"))).toBe(0);
    expect(getDayIdFromDate(new Date("1970-01-02T00:00:00Z"))).toBe(1);
  });

  it("defaults to the current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-01T12:00:00Z"));
    expect(getDayIdFromDate()).toBe(getDayIdFromDate(new Date("2025-03-01T00:00:00Z")));
  });

  it("round-trips Date -> day id -> UTC midnight", () => {
    const date = new Date("2024-06-15T18:30:00Z");
    const dayId = getDayIdFromDate(date);
    expect(getDateFromDayId(dayId).toISOString()).toBe("2024-06-15T00:00:00.000Z");
    expect(getDayIdFromDate(getDateFromDayId(dayId))).toBe(dayId);
  });

  it("handles leap days without local time zone effects", () => {
    expect(getDateFromDayId(getDayIdFromDate(new Date("2024-02-29T23:00:00Z"))).toISOString()).toBe(
      "2024-02-29T00:00:00.000Z",
    );
    expect(getDayIdFromDate(new Date("2024-03-01T00:00:00Z")) - getDayIdFromDate(new Date("2024-02-28T00:00:00Z"))).toBe(2);
  });
});
