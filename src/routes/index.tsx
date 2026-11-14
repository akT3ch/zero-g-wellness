import { createFileRoute, Link } from "@tanstack/react-router";
import { WellnessGuidance } from "@/components/wellness-guidance";
import { NasaBridge } from "@/components/nasa-bridge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Astro Health Monitor" },
      {
        name: "description",
        content: "Daily astronaut health check-ins, trends, body model, tasks and space hazards.",
      },
      { property: "og:title", content: "Astro Health Monitor" },
      {
        property: "og:description",
        content: "Daily astronaut health check-ins, trends, body model, tasks and space hazards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <nav aria-label="Main" className="flex flex-wrap gap-x-5 gap-y-2 border-b px-4 py-3 text-sm">
        <Link to="/" aria-current="page">
          Health Monitor
        </Link>
        <Link to="/mission-demo" className="font-semibold text-primary">
          Mission Control
        </Link>
        <Link to="/research">NASA Research</Link>
        <a href="#wellness-guidance">Wellness Guidance</a>
        <Link to="/evaluation">Task Evaluation</Link>
      </nav>
      <iframe
        src="/astro-health-monitor.html"
        title="Astro Health Monitor"
        allow="bluetooth"
        className="block h-screen w-full border-0"
      />
      <div id="wellness-guidance">
        <WellnessGuidance />
      </div>
      <NasaBridge />
    </>
  );
}
