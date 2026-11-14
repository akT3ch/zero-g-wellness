export const donkiEndpoints = [
  "CME",
  "CMEAnalysis",
  "FLR",
  "SEP",
  "GST",
  "IPS",
  "MPC",
  "RBE",
  "HSS",
  "notifications",
] as const;

export type DonkiEndpoint = (typeof donkiEndpoints)[number];
export type SpaceWeatherEndpoint = DonkiEndpoint | "NOAA";

function text(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 500);
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

export function normalizeSpaceWeather(endpoint: SpaceWeatherEndpoint, raw: unknown[]) {
  return raw
    .filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value),
    )
    .map((record) => {
      if (endpoint === "NOAA") {
        return {
          energy: text(record, ["energy"]),
          flux: Number(record["flux"]),
          time_tag: text(record, ["time_tag"]),
        };
      }

      const eventTime = text(record, ["eventTime", "beginTime", "startTime", "messageIssueTime"]);
      const classType = text(record, ["classType"]);
      return {
        eventTime,
        beginTime: text(record, ["beginTime"]),
        classType,
        eventType: text(record, ["type", "eventType", "messageType"]) || endpoint,
        identifier: text(record, ["activityID", "gstID", "ipsID", "mpcID", "rbeID", "hssID"]),
        summary:
          text(record, ["note", "messageBody", "location", "catalog", "speed"]) ||
          classType ||
          text(record, ["type", "eventType", "messageType"]) ||
          endpoint,
      };
    });
}
