import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
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
      <AppHeader monitorControls />
      <iframe
        src="/astro-health-monitor.html"
        title="Astro Health Monitor"
        allow="bluetooth"
        className="block h-[calc(100vh-3.5rem)] w-full border-0"
      />
      <NasaBridge />
    </>
  );
}
