import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { SPACE_CHALLENGE_RISKS } from "@/lib/research/space-challenge-risks";
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  missionAssessment,
  missionDays,
  missionEvents,
  missionMetrics,
  missionRiskStatus,
} from "@/lib/mission-demo";
import { getMissionStoryChapter, missionStory } from "@/lib/mission-story";

export const Route = createFileRoute("/mission-demo")({
  head: () => ({
    meta: [
      { title: "11 Risks · Mission Control | Zero-G Wellness" },
      {
        name: "description",
        content:
          "Explore a synthetic 30-day Mars transit with astronaut readings, individual baselines and mission events.",
      },
      { property: "og:title", content: "Mission Control | Zero-G Wellness" },
      {
        property: "og:description",
        content:
          "A simulated Mars-transit health monitoring timeline with readings and mission events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionControl,
});

function MissionControl() {
  const [day, setDay] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [metricIndex, setMetricIndex] = useState(0);
  const [storyChoices, setStoryChoices] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!playing || day === 30) return;
    const timer = window.setInterval(() => setDay((current) => Math.min(current + 1, 30)), 1000);
    return () => window.clearInterval(timer);
  }, [playing, day]);
  const metrics = missionAssessment(day);
  const flagged = metrics.filter((metric) => metric.flagged);
  const alerts = missionDays.slice(0, day).flatMap((record) => {
    const deviations = missionAssessment(record.day).filter((metric) => metric.flagged);
    return deviations.length ? [{ day: record.day, deviations }] : [];
  });
  const riskStates = SPACE_CHALLENGE_RISKS.map((risk) => ({ ...risk, status: missionRiskStatus(day, risk.key) }));
  const selected = missionMetrics[metricIndex] ?? missionMetrics[0]!;
  const storyChapter = getMissionStoryChapter(day);
  const selectedStoryChoice = storyChoices[storyChapter.day];
  const chart = missionDays.slice(0, day).map((record) => ({
    day: record.day,
    measured: record.values[metricIndex],
    baseline: day > 5 ? selected.baseline : undefined,
  }));

  return (
    <>
    <AppHeader />
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <header>
        <p className="text-sm font-semibold tracking-widest text-primary">SYNTHETIC MISSION DATA</p>
        <h1 className="mt-2 text-3xl font-bold">11 SPACEFLIGHT RISKS — MISSION CONTROL</h1>
        <p>Autonomous Astronaut Health Monitoring</p>
        <p className="mt-3 text-muted-foreground">
          30-day Mars transit · Crew member 01 · Simulated Earth link with a fixed 12-minute one-way
          delay
        </p>
      </header>
      <section className="grid gap-3 rounded-xl border bg-card p-4" aria-label="Mission playback">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-primary-foreground"
            onClick={() => {
              if (day === 30) setDay(1);
              setPlaying(day === 30 || !playing);
            }}
          >
            {day === 30 ? "Restart" : playing ? "Pause" : day === 1 ? "Start" : "Resume"}
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-2"
            onClick={() => {
              setPlaying(false);
              setDay(1);
            }}
          >
            Reset
          </button>
          <label htmlFor="mission-day">Mission day {day} of 30</label>
        </div>
        <input
          id="mission-day"
          type="range"
          min={1}
          max={30}
          value={day}
          onChange={(event) => {
            setPlaying(false);
            setDay(Number(event.currentTarget.value));
          }}
        />
      </section>
      <section
        className="grid gap-4 rounded-xl border bg-card p-5"
        aria-labelledby="mission-story-title"
      >
        <header>
          <p className="text-sm font-semibold tracking-widest text-primary">
            MISSION FICTION · CHAPTER {missionStory.indexOf(storyChapter) + 1} OF{" "}
            {missionStory.length}
          </p>
          <h2 id="mission-story-title" className="mt-2 text-2xl font-semibold">
            {storyChapter.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Day {storyChapter.day} · {storyChapter.location}
          </p>
        </header>
        <p>{storyChapter.entry}</p>
        <p className="text-sm text-muted-foreground">— {storyChapter.speaker}</p>
        <div
          role="group"
          aria-label="Choose a fictional story response"
          className="grid gap-2 sm:grid-cols-2"
        >
          {storyChapter.choices.map((choice, index) => (
            <button
              key={choice.label}
              type="button"
              aria-pressed={selectedStoryChoice === index}
              className="rounded-md border px-3 py-2 text-left aria-pressed:border-primary aria-pressed:bg-muted"
              onClick={() =>
                setStoryChoices((current) => ({ ...current, [storyChapter.day]: index }))
              }
            >
              {choice.label}
            </button>
          ))}
        </div>
        {selectedStoryChoice !== undefined && (
          <p role="status" className="rounded-md bg-muted p-3 text-sm">
            {storyChapter.choices[selectedStoryChoice]?.response}
          </p>
        )}
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Fictional story choices only change this scene’s dialogue. They do not change mission
          readings, alerts, or health records, and are not saved.
        </p>
      </section>
      <section className="grid gap-4" aria-label="11 spaceflight risks">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">11 spaceflight risks · day {day}</h2>
          <p className="text-sm text-muted-foreground">{riskStates.filter((r) => r.status.level === "watch").length} Watch · {riskStates.filter((r) => r.status.level === "nominal").length} Nominal · {riskStates.filter((r) => r.status.level === "none").length} without demo signal</p>
        </div>
        <p className="text-sm text-muted-foreground">Demo links only: the synthetic mission covers few signals. Use the Health Monitor's 11 Risks tab for the full evaluation with your own check-ins.</p>
        {([["eva_surface", "EVA & surface operations"], ["microgravity_longterm", "Long-term microgravity"], ["environment_immune", "Environment & immune"]] as const).map(([cat, title]) => (
          <div key={cat} className="grid gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {riskStates.filter((r) => r.category === cat).map((r) => (
                <details key={r.key} className={"rounded-xl border bg-card p-4 " + (r.status.level === "watch" ? "border-l-4 border-l-destructive" : "")}>
                  <summary className="cursor-pointer">
                    <span className="font-semibold">#{r.riskNumber} {r.nameEn}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{r.status.level === "watch" ? "Watch" : r.status.level === "nominal" ? "Nominal" : "No signal"} · {r.status.reason}</span>
                  </summary>
                  <p className="mt-3 text-sm">{r.summaryEn}</p>
                  <p className="mt-2 text-sm"><b>Measure:</b> {r.howToMeasureEn}</p>
                  <p className="mt-2 text-sm font-semibold">Watch countermeasures</p>
                  <ul className="list-disc pl-5 text-sm">{r.countermeasureWatch.map((c) => <li key={c}>{c}</li>)}</ul>
                  <p className="mt-2 text-sm font-semibold">Act countermeasures</p>
                  <ul className="list-disc pl-5 text-sm">{r.countermeasureAct.map((c) => <li key={c}>{c}</li>)}</ul>
                  <p className="mt-2 text-xs text-muted-foreground">OSDR studies: {r.studies.map((s) => s.osdId).join(", ")}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="grid gap-3" aria-label="Astronaut health overview">
        <h2 className="text-xl font-semibold">
          {day <= 5
            ? "Establishing individual baseline"
            : flagged.length > 1
              ? "Multi-parameter health deviation detected"
              : flagged.length
                ? "Single-parameter deviation detected"
                : day > 21
                  ? "Recovery: no current deviations above demo thresholds"
                  : "Within demo thresholds"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Compare each reading with the mean of days 1–5. Demo thresholds model directional change
          and have no clinical validation.
        </p>
        {flagged.length > 0 && (
          <p>
            Review the affected measurements, confirm them with a repeat check, and follow the
            mission’s flight surgeon and medical protocols.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {missionMetrics.map((metric, index) => {
            const result = metrics[index];
            return (
              <article key={metric.label} className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold">{metric.label}</h3>
                <p className="text-xl">
                  {missionDays[day - 1]?.values[index]} {metric.unit}
                </p>
                {result && (
                  <p className="text-sm">
                    Baseline {result.baseline} {metric.unit} · {result.percent.toFixed(1)}% change ·{" "}
                    {result.trend}
                  </p>
                )}
                <p className="text-sm">
                  {result?.flagged ? "Deviation flagged · " : ""}Trigger at{" "}
                  {metric.threshold > 0 ? "+" : ""}
                  {metric.threshold} {metric.unit} from baseline
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <h2 className="text-xl font-semibold">Physiological trends</h2>
        <label>
          Measurement{" "}
          <select
            className="rounded border bg-background p-2"
            value={metricIndex}
            onChange={(event) => setMetricIndex(Number(event.currentTarget.value))}
          >
            {missionMetrics.map((metric, index) => (
              <option key={metric.label} value={index}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <div
          className="h-56"
          role="img"
          aria-label={selected.label + " versus baseline by mission day"}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <XAxis dataKey="day" />
              <YAxis unit={selected.unit} />
              <Tooltip />
              <Line dataKey="measured" stroke="var(--color-primary)" isAnimationActive={false} />
              <Line
                dataKey="baseline"
                stroke="var(--color-muted-foreground)"
                strokeDasharray="5 5"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-xl font-semibold">Mission events</h2>
          <ol className="mt-2 space-y-2">
            {missionEvents.map((event) => (
              <li key={event.day}>
                <button
                  type="button"
                  className="text-left underline"
                  onClick={() => {
                    setPlaying(false);
                    setDay(event.day);
                  }}
                >
                  Day {event.day} · {event.label}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted-foreground">
            The day 21 event is a scripted scenario with no personal radiation dose estimate.
          </p>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-xl font-semibold">Health alert timeline</h2>
          {alerts.length ? (
            <ol className="mt-2 max-h-56 space-y-2 overflow-auto">
              {alerts.map((alert) => (
                <li key={alert.day}>
                  Day {alert.day} · {alert.deviations.map((item) => item.label).join(", ")}
                </li>
              ))}
            </ol>
          ) : (
            <p>No deviations through day {day}.</p>
          )}
        </section>
      </div>
    </main>
    </>
  );
}
