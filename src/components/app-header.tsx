import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FileUp, HeartPulse, Settings, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HealthAlerts } from "@/components/health-alerts";
import { WellnessGuidance } from "@/components/wellness-guidance";

export const openWellnessEvent = "zero-g:wellness-open";

const MISSION_SITES = [
  ["iss", "Space station (LEO)"],
  ["mtr", "Mars transit"],
  ["moon", "Moon base"],
  ["mars", "Mars base"],
  ["rov", "Pressurized rover"],
] as const;
const APPEARANCES = ["system", "light", "dark"] as const;

function readStored(key: string, allowed: readonly string[], fallback: string) {
  try {
    const value = localStorage.getItem(key);
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function sendToMonitor(action: string, extra: Record<string, unknown> = {}) {
  const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Astro Health Monitor"]');
  frame?.contentWindow?.postMessage({ type: "zero-g:control", action, ...extra }, window.location.origin);
}

function applyAppTheme(value: string) {
  const dark = value === "dark" || (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function AppHeader({ monitorControls = false }: { monitorControls?: boolean }) {
  const item = "rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground";
  const active = { className: "rounded-md px-3 py-2 bg-primary/10 font-semibold text-primary" };
  const [mission, setMission] = useState("iss");
  const [appearance, setAppearance] = useState("system");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const backupRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMission(
      readStored(
        "ahp1",
        MISSION_SITES.map(([id]) => id),
        "iss",
      ),
    );
    const stored = readStored("ahm-ui-appearance", APPEARANCES, "system");
    setAppearance(stored);
    applyAppTheme(stored);
  }, []);

  const changeMission = (value: string) => {
    setMission(value);
    try {
      localStorage.setItem("ahp1", value);
    } catch {
      /* optional */
    }
    sendToMonitor("mission", { value });
  };
  const changeAppearance = (value: string) => {
    setAppearance(value);
    try {
      localStorage.setItem("ahm-ui-appearance", value);
    } catch {
      /* optional */
    }
    applyAppTheme(value);
    sendToMonitor("appearance", { value });
  };
  const run = (action: string, extra?: Record<string, unknown>) => {
    setSettingsOpen(false);
    sendToMonitor(action, extra);
  };
  const select = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur">
      <Link to="/" className="mr-2 font-bold tracking-wide">
        Zero-G Wellness
      </Link>
      <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1 text-sm">
        <Link to="/" className={item} activeProps={active} activeOptions={{ exact: true }}>
          Health Monitor
        </Link>
        <Link to="/mission-demo" className={item} activeProps={active}>
          11 Risks · Mission Control
        </Link>
        <Link to="/research" className={item} activeProps={active}>
          NASA Research
        </Link>
        <Link to="/evaluation" className={item} activeProps={active}>
          Task Evaluation
        </Link>
      </nav>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          Mission site
          <select
            aria-label="Mission site"
            className={select}
            value={mission}
            onChange={(e) => changeMission(e.target.value)}
          >
            {MISSION_SITES.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <HealthAlerts />
        {monitorControls && (
          <Button type="button" size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings aria-hidden="true" />
          </Button>
        )}
        <Button type="button" size="sm" onClick={() => window.dispatchEvent(new Event(openWellnessEvent))}>
          <HeartPulse aria-hidden="true" />
          Wellness Guidance
        </Button>
      </div>
      <WellnessGuidance />
      {monitorControls && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Data stays in this browser. Replacing or deleting asks for confirmation and can be undone.
              </DialogDescription>
            </DialogHeader>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Appearance</h3>
              <select
                aria-label="Appearance"
                className={select}
                value={appearance}
                onChange={(e) => changeAppearance(e.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Load data</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => run("demo")}>
                  <Sparkles />
                  Load demo data
                </Button>
                <Button variant="outline" onClick={() => backupRef.current?.click()}>
                  <FileUp />
                  Import health backup
                </Button>
                <Button variant="outline" onClick={() => csvRef.current?.click()}>
                  <FileUp />
                  Import CSV
                </Button>
              </div>
              <input
                ref={backupRef}
                type="file"
                accept=".json,application/json"
                hidden
                aria-label="Choose health backup"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) run("import-backup", { file });
                  e.target.value = "";
                }}
              />
              <input
                ref={csvRef}
                type="file"
                accept=".csv,.txt"
                hidden
                aria-label="Choose CSV file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) run("import-csv", { file });
                  e.target.value = "";
                }}
              />
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Export data</h3>
              <Button variant="outline" onClick={() => run("export")}>
                <Download />
                Export local backup
              </Button>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Delete data</h3>
              <Button variant="destructive" onClick={() => run("delete")}>
                <Trash2 />
                Delete saved entries
              </Button>
            </section>
          </DialogContent>
        </Dialog>
      )}
    </header>
  );
}
