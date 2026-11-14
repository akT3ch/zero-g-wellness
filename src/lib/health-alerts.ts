export type AlertLevel = 0 | 1 | 2;
export type HealthAlert = { area: string; level: 1 | 2; reasons: string[] };
export type AlertSnapshot = { date: string | null; alerts: HealthAlert[] };

export const ALERT_STORAGE_KEY = "ahm-ui-alerts";
export const LEVEL_LABEL = ["Normal", "Watch", "Act"] as const;

export function parseAlertMessage(data: unknown): AlertSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "astro:alerts" || !Array.isArray(msg.alerts)) return null;
  const alerts = msg.alerts
    .filter((a): a is HealthAlert => !!a && typeof a === "object" && typeof (a as HealthAlert).area === "string" && ((a as HealthAlert).level === 1 || (a as HealthAlert).level === 2) && Array.isArray((a as HealthAlert).reasons))
    .map((a) => ({ area: a.area, level: a.level, reasons: a.reasons.filter((r) => typeof r === "string").slice(0, 6) }))
    .sort((a, b) => b.level - a.level);
  return { date: typeof msg.date === "string" ? msg.date : null, alerts };
}

export function overallLevel(alerts: HealthAlert[]): AlertLevel {
  return alerts.reduce<AlertLevel>((max, a) => (a.level > max ? a.level : max), 0);
}

/** Areas whose level rose compared with the previous snapshot (new or escalated deviations). */
export function escalations(prev: HealthAlert[], next: HealthAlert[]): HealthAlert[] {
  return next.filter((a) => a.level > (prev.find((p) => p.area === a.area)?.level ?? 0));
}
