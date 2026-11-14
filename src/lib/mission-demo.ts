export const missionMetrics = [
  {
    label: "Resting heart rate",
    unit: "bpm",
    onset: 11,
    baseline: 62,
    deviation: 12,
    threshold: 8,
  },
  { label: "Sleep duration", unit: "h", onset: 6, baseline: 8, deviation: -2, threshold: -1 },
  { label: "Stress", unit: "/10", onset: 16, baseline: 3, deviation: 4, threshold: 2 },
  { label: "Fatigue", unit: "/10", onset: 16, baseline: 2, deviation: 5, threshold: 2 },
  { label: "Mood", unit: "/10", onset: 16, baseline: 8, deviation: -3, threshold: -2 },
  { label: "Sleep quality", unit: "/10", onset: 16, baseline: 8, deviation: -4, threshold: -2 },
];

export const missionEvents = [
  { day: 1, label: "Establish individual baseline" },
  { day: 6, label: "Sleep duration begins declining" },
  { day: 11, label: "Resting heart rate starts increasing" },
  { day: 16, label: "Stress and fatigue rise" },
  { day: 21, label: "Simulated solar particle event" },
  { day: 22, label: "Recovery begins" },
];

export const missionDays = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const values = missionMetrics.map(({ onset, baseline, deviation }) => {
    const progress = day <= 21 ? Math.min(1, Math.max(0, (day - onset + 1) / 5)) : (30 - day) / 9;
    return Number((baseline + deviation * progress).toFixed(1));
  });
  return { day, values };
});

export function missionAssessment(day: number) {
  const current = missionDays[day - 1];
  if (!current || day <= 5) return [];
  return missionMetrics.flatMap((metric, index) => {
    const baseline =
      missionDays
        .slice(0, 5)
        .reduce((total, record) => total + (record.values[index] ?? metric.baseline), 0) / 5;
    const value = current.values[index];
    const previous = missionDays[day - 2]?.values[index];
    if (value === undefined || previous === undefined) return [];
    const difference = value - baseline;
    const percent = (100 * difference) / baseline;
    const trend = value > previous ? "Rising" : value < previous ? "Falling" : "Steady";
    const flagged =
      metric.threshold > 0 ? difference >= metric.threshold : difference <= metric.threshold;
    return [{ ...metric, value, baseline, percent, trend, flagged }];
  });
}
