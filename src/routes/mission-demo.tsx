import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { missionAssessment, missionDays, missionEvents, missionMetrics } from "@/lib/mission-demo";

export const Route = createFileRoute("/mission-demo")({
  head: () => ({ meta: [{ title: "Mission Control | Zero-G Wellness" }] }),
  component: MissionControl,
});

function MissionControl() {
  const [day, setDay] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [metricIndex, setMetricIndex] = useState(0);
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
  const selected = missionMetrics[metricIndex] ?? missionMetrics[0]!;
  const chart = missionDays.slice(0, day).map((record) => ({
    day: record.day,
    measured: record.values[metricIndex],
    baseline: day > 5 ? selected.baseline : undefined,
  }));

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <nav aria-label="Main" className="flex flex-wrap gap-4 text-sm underline">
        <Link to="/">Health Monitor</Link>
        <Link to="/research">NASA Research</Link>
        <a href="/#wellness-guidance">Wellness Guidance</a>
        <Link to="/evaluation">Task Evaluation</Link>
      </nav>
      <header>
        <p className="text-sm font-semibold tracking-widest text-primary">SYNTHETIC MISSION DATA</p>
        <h1 className="mt-2 text-3xl font-bold">ZERO-G WELLNESS — MISSION CONTROL</h1>
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
  );
}
