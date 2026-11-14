import { describe, expect, it } from "vitest";
import {
  missionAssessment,
  missionDays,
  missionEvents,
  missionRiskStatus,
} from "@/lib/mission-demo";

describe("synthetic Mars transit", () => {
  it("provides a fixed sequential record and a five-day baseline", () => {
    expect(missionDays.map((record) => record.day)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    expect(missionDays[0]?.values).toEqual([62, 8, 3, 2, 8, 8]);
    expect(missionAssessment(5)).toEqual([]);
    expect(missionAssessment(31)).toEqual([]);
  });

  it("surfaces sleep, cardiovascular and multi-parameter deviations as they develop", () => {
    expect(
      missionAssessment(10)
        .filter((metric) => metric.flagged)
        .map((metric) => metric.label),
    ).toEqual(["Sleep duration"]);
    expect(missionAssessment(15)[0]).toMatchObject({ value: 74, baseline: 62, flagged: true });
    expect(missionAssessment(20).filter((metric) => metric.flagged)).toHaveLength(6);
    expect(missionEvents.find((event) => event.day === 21)?.label).toContain("Simulated");
  });

  it("shows improving trends and recovers to baseline", () => {
    expect(missionAssessment(22)[0]?.trend).toBe("Falling");
    expect(missionAssessment(22)[1]?.trend).toBe("Rising");
    expect(missionAssessment(30).every((metric) => metric.percent === 0 && !metric.flagged)).toBe(
      true,
    );
  });
});

describe("mission risk links", () => {
  it("flags cardiovascular only once heart rate exceeds its threshold", () => {
    expect(missionRiskStatus(3, "cardiovascular").level).toBe("nominal");
    expect(missionRiskStatus(15, "cardiovascular").level).toBe("watch");
  });
  it("marks risks without demo signals as none", () => {
    expect(missionRiskStatus(15, "bone_changes").level).toBe("none");
  });
});
