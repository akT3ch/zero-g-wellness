import { describe, expect, it } from "vitest";
import { escalations, overallLevel, parseAlertMessage } from "@/lib/health-alerts";

describe("health alert traffic light", () => {
  it("is red (Act) when any area is Act, yellow for Watch, green when none", () => {
    expect(overallLevel([{ area: "A", level: 1, reasons: [] }, { area: "B", level: 2, reasons: [] }])).toBe(2);
    expect(overallLevel([{ area: "A", level: 1, reasons: [] }])).toBe(1);
    expect(overallLevel([])).toBe(0);
  });
  it("notifies only new or escalated areas", () => {
    const prev = [{ area: "Cardiovascular", level: 1 as const, reasons: [] }];
    const next = [{ area: "Cardiovascular", level: 2 as const, reasons: [] }, { area: "Mind and sleep", level: 1 as const, reasons: [] }];
    expect(escalations(prev, next).map((a) => a.area)).toEqual(["Cardiovascular", "Mind and sleep"]);
    expect(escalations(next, next)).toEqual([]);
  });
  it("rejects malformed messages and invalid levels", () => {
    expect(parseAlertMessage({ type: "other", alerts: [] })).toBeNull();
    expect(parseAlertMessage({ type: "astro:alerts", alerts: [{ area: "X", level: 5, reasons: [] }] })?.alerts).toEqual([]);
  });
});
