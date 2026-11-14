import { Link } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WellnessGuidance } from "@/components/wellness-guidance";

export const openWellnessEvent = "zero-g:wellness-open";

export function AppHeader() {
  const item = "rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground";
  const active = { className: "rounded-md px-3 py-2 bg-primary/10 font-semibold text-primary" };
  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur">
      <Link to="/" className="mr-2 font-bold tracking-wide">Zero-G Wellness</Link>
      <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1 text-sm">
        <Link to="/" className={item} activeProps={active} activeOptions={{ exact: true }}>Health Monitor</Link>
        <Link to="/mission-demo" className={item} activeProps={active}>11 Risks · Mission Control</Link>
        <Link to="/research" className={item} activeProps={active}>NASA Research</Link>
        <Link to="/evaluation" className={item} activeProps={active}>Task Evaluation</Link>
      </nav>
      <Button type="button" size="sm" onClick={() => window.dispatchEvent(new Event(openWellnessEvent))}>
        <HeartPulse aria-hidden="true" />Wellness Guidance
      </Button>
      <WellnessGuidance />
    </header>
  );
}
