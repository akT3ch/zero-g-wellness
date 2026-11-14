import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALERT_STORAGE_KEY, LEVEL_LABEL, escalations, overallLevel, parseAlertMessage, type AlertSnapshot } from "@/lib/health-alerts";

const LIGHT = ["bg-alert-ok", "bg-alert-watch", "bg-alert-act"];

function readStored(): AlertSnapshot | null {
  try { return parseAlertMessage({ type: "astro:alerts", ...JSON.parse(localStorage.getItem(ALERT_STORAGE_KEY) || "null") }); } catch { return null; }
}

export function HealthAlerts() {
  const [snap, setSnap] = useState<AlertSnapshot | null>(null);
  useEffect(() => {
    setSnap(readStored());
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Astro Health Monitor"]');
      if (!frame || event.source !== frame.contentWindow) return;
      const next = parseAlertMessage(event.data);
      if (!next) return;
      setSnap((prev) => {
        for (const a of escalations(prev?.alerts ?? [], next.alerts)) {
          const text = `${a.area}: ${LEVEL_LABEL[a.level]}`;
          if (a.level === 2) toast.error(text, { description: a.reasons[0] });
          else toast.warning(text, { description: a.reasons[0] });
        }
        return next;
      });
      try { localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify({ date: next.date, alerts: next.alerts })); } catch { /* optional */ }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const alerts = snap?.alerts ?? [];
  const level = overallLevel(alerts);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" aria-label={`Health notifications: ${LEVEL_LABEL[level]}, ${alerts.length} deviations`}>
          <span className="relative"><Bell aria-hidden="true" /><span className={`absolute -right-1 -top-1 size-2.5 rounded-full ${LIGHT[level]}`} /></span>
          {LEVEL_LABEL[level]}{alerts.length > 0 && ` · ${alerts.length}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="mb-3 flex items-center gap-2" aria-hidden="true">
          {LIGHT.map((c, i) => <span key={c} className={`size-3 rounded-full ${c} ${i === level ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "opacity-30"}`} />)}
          <span className="ml-1 text-sm font-semibold">{LEVEL_LABEL[level]}</span>
        </div>
        {!snap ? <p className="text-sm text-muted-foreground">No check-in evaluated yet. Open the Health Monitor and save a check-in.</p>
          : alerts.length === 0 ? <p className="text-sm text-muted-foreground">All health areas normal{snap.date ? ` (check-in ${snap.date})` : ""}.</p>
          : <ul className="max-h-80 space-y-3 overflow-auto">
              {alerts.map((a) => (
                <li key={a.area} className="border-l-4 pl-3" style={{ borderColor: `var(--alert-${a.level === 2 ? "act" : "watch"})` }}>
                  <p className="text-sm font-semibold">{a.area} · {LEVEL_LABEL[a.level]}</p>
                  <ul className="text-xs text-muted-foreground">{a.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                </li>
              ))}
            </ul>}
        <p className="mt-3 text-xs text-muted-foreground">Based on the latest saved check-in{snap?.date ? ` (${snap.date})` : ""}. Not a diagnosis; for Act, contact the flight surgeon.</p>
      </PopoverContent>
    </Popover>
  );
}
