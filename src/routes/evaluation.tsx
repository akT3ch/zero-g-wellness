import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Play, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { dimensions, tasks, evaluationSchema, rawTlx, summarize, risks, type Evaluation } from '@/lib/ergonomics';

export const Route = createFileRoute('/evaluation')({
  head: () => ({ meta: [
    { title: 'Task Evaluation · Astro Health Monitor' },
    { name: 'description', content: 'Local task observations, workload feedback and human-error review for Astro Health Monitor.' },
    { property: 'og:title', content: 'Task Evaluation · Astro Health Monitor' },
    { property: 'og:description', content: 'Task-specific ergonomics measurements and participant feedback, separate from health monitoring.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: EvaluationPage,
});
const storageKey = 'ahm-evaluation-observations';
function EvaluationPage() {
  const [records, setRecords] = useState<Evaluation[]>([]);
  const [ready, setReady] = useState(false);
  const [task, setTask] = useState<(typeof tasks)[number]>(tasks[0]);
  const [filter, setFilter] = useState('All tasks');
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);
  const [seconds, setSeconds] = useState('');
  const [steps, setSteps] = useState('');
  const [errors, setErrors] = useState('');
  const [navigation, setNavigation] = useState('');
  const [completed, setCompleted] = useState(true);
  const [workload, setWorkload] = useState<(number | null)[]>(Array(6).fill(null));
  const [satisfaction, setSatisfaction] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('Observations');
  useEffect(() => {
    try { const saved = evaluationSchema.array().parse(JSON.parse(localStorage.getItem(storageKey) || '[]')); setRecords(saved); }
    catch { setMessage('Stored observations could not be read. No health records were affected.'); }
    setReady(true);
  }, []);
  function persist(next: Evaluation[]) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setRecords(next); return true; }
    catch { setMessage('This browser could not save the observation. Your entries are unchanged.'); return false; }
  }
  const selected = records.filter(record => filter === 'All tasks' || record.task === filter);
  const metrics = summarize(selected);
  function save(event: React.FormEvent) {
    event.preventDefault();
    const partialWorkload = workload.some(value => value !== null) && workload.some(value => value === null);
    if (partialWorkload) { setMessage('Rate all six workload dimensions, or clear the ratings to omit feedback.'); return; }
    if ([seconds, steps, errors, navigation].some(value => value.trim() === '')) { setMessage('Enter observed time, steps, errors and navigation changes, including zero where observed.'); return; }
    const result = evaluationSchema.safeParse({ id: crypto.randomUUID(), date: new Date().toISOString(), task, completed, seconds: Number(seconds), steps: Number(steps), errors: Number(errors), navigation: Number(navigation), workload: workload.every(value => value === null) ? null : workload, satisfaction: satisfaction ? Number(satisfaction) : null });
    if (!result.success) { setMessage('Check the numeric values. Counts must be whole numbers; ratings must stay within their scales.'); return; }
    if (persist([...records, result.data])) { setMessage('Observation saved locally.'); setSeconds(''); setSteps(''); setErrors(''); setNavigation(''); setWorkload(Array(6).fill(null)); setSatisfaction(''); }
  }
  function exportRecords() {
    const blob = new Blob([JSON.stringify({ method: 'Unweighted Raw NASA-TLX; performance encoded as difficulty (0 perfect, 100 failure)', source: 'Manually entered task observations and optional participant feedback', records }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'astro-task-evaluation.json'; anchor.click(); URL.revokeObjectURL(url);
  }
  return <main className="mx-auto max-w-6xl px-4 py-8 text-foreground sm:px-8">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <div><Button asChild variant="ghost" className="mb-3"><Link to="/"><ArrowLeft />Health monitor</Link></Button><h1 className="text-2xl font-semibold">Task evaluation</h1><p className="mt-2 text-sm text-muted-foreground">Internal evaluation · local observations only · no automatic health-data collection</p></div>
      <Button variant="outline" onClick={exportRecords} disabled={!records.length}><Download />Export observations</Button>
    </header>
    <nav aria-label="Evaluation views" className="flex flex-wrap gap-2 border-b border-border py-4">{['Observations', 'Error analysis', 'Walkthrough'].map(value => <Button key={value} variant={tab === value ? 'secondary' : 'ghost'} aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</Button>)}</nav>
    {message && <p role="status" className="my-4 border-l-4 border-primary bg-muted p-3 text-sm">{message}</p>}
    {tab === 'Observations' && <>
      <div className="flex flex-wrap items-center justify-between gap-4 py-6"><h2 className="text-lg font-semibold">Task metrics</h2><label className="text-sm">Task filter<select className="ml-3 rounded-md border border-input bg-background p-2" value={filter} onChange={event => setFilter(event.target.value)}><option>All tasks</option>{tasks.map(value => <option key={value}>{value}</option>)}</select></label></div>
      <div className="grid grid-cols-2 gap-5 border-b border-border pb-6 sm:grid-cols-4">{[
        ['Completion', metrics ? metrics.completion + '%' : 'Not measured'], ['Time', metrics ? metrics.seconds + ' s avg' : 'Not measured'], ['Steps', metrics ? metrics.steps + ' avg' : 'Not measured'], ['Errors', metrics ? String(metrics.errors) + ' total' : 'Not measured'], ['Navigation changes', metrics ? metrics.navigation + ' avg' : 'Not measured'], ['Raw TLX', metrics?.workload == null ? 'No feedback' : metrics.workload + '/100'], ['Satisfaction', metrics?.satisfaction == null ? 'No feedback' : metrics.satisfaction + '/5'], ['Observations', String(selected.length)],
      ].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>)}</div>
      <p className="py-3 text-xs text-muted-foreground">Times and counts are observer-entered measurements; workload and satisfaction are participant feedback. No estimated values are mixed into metrics.</p>
      <form onSubmit={save} className="py-6">
        <h2 className="mb-5 text-lg font-semibold">Record a task observation</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4"><label className="block text-sm">Observed task<select value={task} disabled={running} onChange={event => { const next = tasks.find(value => value === event.target.value); if (next) setTask(next); }} className="mt-2 w-full rounded-md border border-input bg-background p-3">{tasks.map(value => <option key={value}>{value}</option>)}</select></label>
            <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => { if (running && timer.current !== null) { setSeconds(((performance.now() - timer.current) / 1000).toFixed(1)); timer.current = null; setRunning(false); } else { timer.current = performance.now(); setRunning(true); } }}>{running ? <><Square />Stop timer</> : <><Play />Start timer</>}</Button>{running && <span role="status" className="text-sm">Timer running</span>}</div>
            <div className="grid grid-cols-2 gap-4">{[['Observed seconds', seconds, setSeconds], ['Interaction steps', steps, setSteps], ['Observed errors', errors, setErrors], ['Navigation changes', navigation, setNavigation]].map(([label, value, setter]) => <label className="text-sm" key={String(label)}>{String(label)}<Input type="number" min="0" step={label === 'Observed seconds' ? '0.1' : '1'} value={String(value)} onChange={event => { if (typeof setter === 'function') setter(event.target.value); }} className="mt-2" required /></label>)}</div>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} />Task completed successfully</label>
            <label className="block text-sm">Participant satisfaction (optional)<select value={satisfaction} onChange={event => setSatisfaction(event.target.value)} className="mt-2 w-full rounded-md border border-input bg-background p-3"><option value="">Not collected</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}{value === 1 ? ' · Very dissatisfied' : value === 5 ? ' · Very satisfied' : ''}</option>)}</select></label>
          </div>
          <fieldset className="space-y-4"><legend className="font-semibold">Task-specific workload feedback (optional)</legend><p className="text-xs text-muted-foreground">Unweighted Raw NASA-TLX: six ratings in steps of 5. Demand, effort and frustration: 0 low, 100 high. Performance difficulty: 0 perfect success, 100 failure. No validated overload cutoff is assumed.</p>
            {dimensions.map((dimension, index) => <div key={dimension}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{dimension}</span><span>{workload[index] === null ? 'Unrated' : workload[index] + '/100'}</span></div><Slider aria-label={dimension} min={0} max={100} step={5} value={[workload[index] ?? 50]} className="h-8" onValueChange={values => setWorkload(previous => previous.map((value, position) => position === index ? values[0] ?? null : value))} /><div className="flex justify-between text-xs text-muted-foreground"><span>{index === 3 ? 'Perfect success' : 'Low'}</span><span>{index === 3 ? 'Failure' : 'High'}</span></div></div>)}
            <Button type="button" variant="ghost" onClick={() => setWorkload(Array(6).fill(null))}>Clear workload ratings</Button>
          </fieldset>
        </div>
        <Button className="mt-6" disabled={!ready || running}>Save observation</Button>
      </form>
      <section className="border-t border-border py-6"><h2 className="mb-4 text-lg font-semibold">Observation history</h2>{!selected.length ? <p className="text-sm text-muted-foreground">No task observations recorded.</p> : selected.slice().reverse().map(record => <article key={record.id} className="border-b border-border py-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{record.task}</h3><p className="mt-1 text-sm text-muted-foreground">{new Date(record.date).toLocaleDateString()} · {record.completed ? 'Completed' : 'Not completed'} · {record.seconds} s · {record.steps} steps · {record.errors} errors</p></div><Button variant="ghost" size="icon" aria-label={'Delete observation for ' + record.task} title="Delete observation" onClick={() => { if (window.confirm('Delete this evaluation observation? Health records will not be changed.')) persist(records.filter(item => item.id !== record.id)); }}><Trash2 /></Button></div>{record.workload && <div className="mt-4 grid gap-2 sm:grid-cols-2">{record.workload.map((value, index) => <div key={dimensions[index]}><p className="text-xs">{dimensions[index]} · {value}/100</p><meter className="mt-1 h-3 w-full accent-primary" aria-label={dimensions[index]} min={0} max={100} value={value} /></div>)}<p className="text-sm">Raw TLX: {rawTlx(record.workload)}/100</p><p className="text-xs text-muted-foreground">Review the highest-rated dimensions with the participant: simplify choices for mental demand, enlarge/reposition controls for physical demand, clarify status for frustration. These are review prompts, not scientific conclusions.</p></div>}</article>)}</section>
    </>}
    {tab === 'Error analysis' && <section className="py-6"><h2 className="text-lg font-semibold">SHERPA-inspired risk register</h2><p className="mt-2 text-sm text-muted-foreground">Expert estimates, not measured error probabilities. Highest-impact risks are reviewed first.</p>{risks.map(risk => <article key={risk.error} className="border-b border-border py-5"><h3 className="font-semibold">{risk.task} · {risk.type} error</h3><p className="mt-2 text-sm">{risk.error}</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{Object.entries({ Cause: risk.cause, Consequence: risk.consequence, Priority: risk.priority, Prevention: risk.prevention, Recovery: risk.recovery, Status: risk.status }).map(([key, value]) => <div key={key}><dt className="text-xs text-muted-foreground">{key}</dt><dd>{value}</dd></div>)}</dl></article>)}</section>}
    {tab === 'Walkthrough' && <section className="py-6"><h2 className="text-lg font-semibold">Cognitive walkthrough</h2><p className="mt-2 text-sm text-muted-foreground">Expert review protocol: goal understood → action recognized → result expected → feedback understood.</p>{tasks.map(value => <article key={value} className="border-b border-border py-5"><h3 className="font-semibold">{value}</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm"><li>Identify the goal and open the named screen or action.</li><li>Recognize the labeled controls; inspect measured/entered status or selected context.</li><li>Choose the primary action; check any confirmation or consent before proceeding.</li><li>Read the saved, completed, pending or failed outcome; verify it matches the task.</li></ol><p className="mt-3 text-xs text-muted-foreground">Observe recognition barriers and record real steps, time and errors under Observations. No participant result has been assumed.</p></article>)}<h3 className="mt-6 font-semibold">Review cycle</h3><p className="mt-2 text-sm">Analyze → Identify → Prioritize → Implement → Test → Evaluate → Improve</p><p className="mt-2 text-xs text-muted-foreground">Fitts: full-size body controls and reachable save actions. Hick-Hyman: grouped data options, task filters and secondary details. Real movement-time and decision-time validation remains uncollected.</p></section>}
  </main>;
}