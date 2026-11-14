import { requiredValue } from "@/lib/research/required-value";
import { numeric } from "@/lib/research/import";
import type { Dataset, Result } from "@/lib/research/types";

const minimumTimePoints = 7;
const projectionIntervals = 3;
const robustResidualThreshold = 3;

function median(values: number[]) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? requiredValue(sorted[middle])
    : (requiredValue(sorted[middle - 1]) + requiredValue(sorted[middle])) / 2;
}

function timeValue(value: unknown, type: string) {
  if (type === "date/time") {
    if (value === null || value === undefined || value === "") return null;
    const timestamp = Date.parse(String(value));
    return Number.isFinite(timestamp) ? timestamp / 86400000 : null;
  }
  return numeric(value as string | number | boolean | null | undefined);
}

export function screenPatterns(dataset: Dataset, time: string, value: string, group = ""): Result {
  if (
    !dataset.columns.includes(time) ||
    !dataset.columns.includes(value) ||
    (group && !dataset.columns.includes(group))
  ) {
    throw new Error("Choose columns that exist in the current research dataset.");
  }
  if (time === value || time === group || value === group)
    throw new Error("Time, measurement and grouping variables must be different.");
  const timeType = requiredValue(dataset.types[time]);
  if (!["date/time", "numerical"].includes(timeType))
    throw new Error("Choose a date/time or numerical time variable.");
  if (requiredValue(dataset.types[value]) !== "numerical")
    throw new Error("Choose a numerical measurement variable.");

  const valid = dataset.rows.flatMap((row) => {
    const x = timeValue(row[time], timeType);
    const y = numeric(row[value]);
    if (x === null || y === null) return [];
    return [
      {
        x,
        y,
        group: group ? String(requiredValue(row[group]) ?? "Missing group") : "All observations",
      },
    ];
  });
  if (!valid.length) throw new Error("No rows have valid time and numerical measurement values.");

  const groups = [...new Set(valid.map((row) => row.group))];
  const details: Record<string, number | string> = {};
  let analyzedRows = 0;
  for (const name of groups) {
    const rows = valid.filter((row) => row.group === name);
    const byTime = new Map<number, { sum: number; count: number }>();
    rows.forEach((row) => {
      const current = byTime.get(row.x) ?? { sum: 0, count: 0 };
      current.sum += row.y;
      current.count += 1;
      byTime.set(row.x, current);
    });
    const points = [...byTime.entries()]
      .map(([x, entry]) => ({ x, y: entry.sum / entry.count, n: entry.count }))
      .sort((a, b) => a.x - b.x);
    if (points.length < minimumTimePoints) {
      throw new Error(
        `Group "${name}" has ${points.length} distinct time points; at least ${minimumTimePoints} are required.`,
      );
    }

    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const sumSquaresX = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    if (sumSquaresX === 0)
      throw new Error(`Group "${name}" needs at least two distinct time points.`);
    const slope =
      points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / sumSquaresX;
    const intercept = meanY - slope * meanX;
    const residuals = points.map((point) => point.y - (intercept + slope * point.x));
    const totalSquares = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
    const residualSquares = residuals.reduce((sum, residual) => sum + residual ** 2, 0);
    const rSquared = totalSquares === 0 ? 1 : Math.max(0, 1 - residualSquares / totalSquares);
    const intervals = points
      .slice(1)
      .map((point, index) => point.x - requiredValue(points[index]).x);
    const typicalInterval = median(intervals);
    const projectionTarget =
      requiredValue(points[points.length - 1]).x + projectionIntervals * typicalInterval;
    const projection = intercept + slope * projectionTarget;
    const residualMedian = median(residuals);
    const mad = median(residuals.map((residual) => Math.abs(residual - residualMedian)));
    const candidates =
      mad === 0
        ? []
        : points.filter(
            (point, index) =>
              Math.abs(requiredValue(residuals[index]) - residualMedian) >
              robustResidualThreshold * 1.4826 * mad,
          );
    const timeLabel = timeType === "date/time" ? "day" : "time unit";

    details[`${name} distinct time points`] = points.length;
    details[`${name} rows averaged across time points`] = rows.length - points.length;
    details[`${name} linear fit R²`] = rSquared;
    details[`${name} slope per ${timeLabel}`] = slope;
    details[`${name} projection target`] =
      timeType === "date/time"
        ? new Date(projectionTarget * 86400000).toISOString().slice(0, 10)
        : projectionTarget;
    details[`${name} projection after ${projectionIntervals} typical intervals`] = projection;
    details[`${name} residual candidates (> ${robustResidualThreshold} × scaled MAD)`] =
      mad === 0
        ? "Not screened: residual MAD is zero."
        : candidates.length
          ? candidates
              .map(
                (point) =>
                  `${timeType === "date/time" ? new Date(point.x * 86400000).toISOString().slice(0, 10) : point.x}: ${point.y}`,
              )
              .join("; ")
          : "None.";
    analyzedRows += rows.length;
  }

  return {
    method: "Exploratory pattern screening",
    variables: [time, value, ...(group ? [group] : [])],
    n: analyzedRows,
    excluded: dataset.rows.length - analyzedRows,
    details,
    limitations: [
      `At least ${minimumTimePoints} distinct time points are required per group; duplicate time points are averaged before fitting.`,
      `The linear projection extends the fitted line by ${projectionIntervals} median observation intervals; it is a descriptive scenario, not a validated forecast.`,
      `Residual candidates use a descriptive threshold of ${robustResidualThreshold} × 1.4826 × median absolute deviation; they are not medical alerts or diagnoses.`,
      "No p-value, causal claim or clinical risk category is produced. Time spacing, measurement units, study design and biological replication must be reviewed by the researcher.",
      group
        ? "Groups are analyzed separately; this does not establish that observations within a group are independent."
        : "All valid rows are analyzed together; select a grouping variable (such as astronaut or subject ID) when separate trajectories should not be pooled.",
      "The original imported dataset is not changed; analysis uses the current research working table in this browser session.",
    ],
  };
}
