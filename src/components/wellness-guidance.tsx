import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { HeartPulse, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getWellnessGuidance } from '@/lib/wellness.functions';
import { readingSchema, emergencyGuidance, type Reading, type Guidance } from '@/lib/wellness';

export function WellnessGuidance() {
  const [open, setOpen] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [mission, setMission] = useState('');
  const [share, setShare] = useState(false);
  const [consent, setConsent] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [pending, setPending] = useState(false);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState('');
  const lock = useRef(false);
  const request = useServerFn(getWellnessGuidance);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const iframe = document.querySelector('iframe');
      if (event.origin !== window.location.origin || event.source !== iframe?.contentWindow || event.data?.type !== 'astro:wellness-open') return;
      const parsed = readingSchema.array().max(7).safeParse(event.data.readings);
      if (!parsed.success || typeof event.data.mission !== 'string') return;
      setReadings(parsed.data); setMission(event.data.mission.slice(0,100)); setOpen(true);
    };
    const openDirect = () => setOpen(true);
    window.addEventListener('message', receive);
    window.addEventListener('zero-g:wellness-open', openDirect);
    return () => { window.removeEventListener('message', receive); window.removeEventListener('zero-g:wellness-open', openDirect); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    if (emergency) { setGuidance(emergencyGuidance); setSubmitted('Emergency safety guidance · no AI request sent'); return; }
    if (symptoms.trim().length < 10) { setError('Describe your symptoms in at least 10 characters, including when they started.'); return; }
    if (!consent) { setError('Confirm sharing your symptoms with AI Gateway before requesting guidance.'); return; }
    lock.current = true; setPending(true); setGuidance(null);
    setSubmitted(symptoms.trim());
    try {
      const result = await request({ data: { symptoms, mission, readings: share ? readings : [], consent: true, emergency: false } });
      if (result.error) setError(result.error);
      else setGuidance(result.guidance);
    } catch { setError('Guidance is unavailable right now. Your symptoms are unchanged; the request will not be retried automatically. Seek professional care if needed.'); }
    finally { lock.current = false; setPending(false); }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><HeartPulse aria-hidden="true" />Wellness guidance</DialogTitle>
        <DialogDescription>General AI guidance, not a diagnosis, treatment plan, or medical clearance.</DialogDescription>
      </DialogHeader>
      <div className="border-l-4 border-destructive bg-destructive/10 p-3 text-sm">
        <p className="font-semibold flex gap-2 items-center"><ShieldAlert className="size-4 shrink-0" aria-hidden="true" />Do not wait for AI in an emergency</p>
        <p className="mt-1">Chest pain, severe trouble breathing, fainting, new weakness or speech difficulty, or immediate self-harm danger: contact emergency services or your flight surgeon now.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={emergency} onChange={event => { setEmergency(event.target.checked); setGuidance(null); }} className="mt-1 size-4 accent-primary" disabled={pending} />I am experiencing an emergency warning sign.</label>
        <div>
          <label htmlFor="wellness-symptoms" className="text-sm font-semibold">Symptoms and context (required)</label>
          <Textarea id="wellness-symptoms" maxLength={3000} value={symptoms} onChange={event => setSymptoms(event.target.value)} disabled={pending} className="mt-2 min-h-28" placeholder="What are you feeling? When did it start, how severe is it, and is it getting worse?" aria-describedby="symptom-privacy" />
          <p id="symptom-privacy" className="mt-1 text-xs text-muted-foreground">Avoid names, contact details, or other identifying information. {symptoms.length}/3000</p>
        </div>
        <div className="border-y border-border py-3">
          <label className="flex gap-3 items-center text-sm"><input type="checkbox" className="size-4 accent-primary" checked={share} onChange={event => setShare(event.target.checked)} disabled={pending || !readings.length} />Share recent readings ({readings.length} check-ins)</label>
          {readings.length ? <details className="mt-2 text-sm"><summary className="cursor-pointer py-2 text-muted-foreground">Review readings before sharing</summary>
            <p className="mb-2 text-muted-foreground">Latest seven saved check-ins; only measured or entered values. No live cabin feed or unsaved values.</p>
            {readings.map(reading => <div key={reading.date} className="py-2 border-t border-border"><strong>{reading.date}</strong><ul className="mt-1 text-muted-foreground">{reading.values.map(value => <li key={value.name}>{value.name}: {value.value} {value.unit}</li>)}{reading.symptoms.map(symptom => <li key={symptom}>Reported symptom: {symptom}</li>)}</ul>{!reading.values.length && !reading.symptoms.length && <p className="text-muted-foreground">No measured values or symptoms recorded.</p>}</div>)}
          </details> : <p className="mt-2 text-xs text-muted-foreground">No saved readings yet. You can request guidance using your symptoms alone.</p>}
        </div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 size-4 accent-primary" disabled={pending} /><span>I agree to send my symptoms, mission site, and any selected readings to AI Gateway for this request. This app does not save this conversation. AI service processing and logging policies apply.</span></label>
        <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">{pending ? <><Loader2 className="animate-spin" />Preparing guidance…</> : <><HeartPulse />{emergency ? 'Show emergency care advice' : 'Get wellness guidance'}</>}</Button>
      </form>
      {pending && <p role="status" className="text-sm text-muted-foreground">Reviewing the information you chose to share. You can close this panel; your request will continue.</p>}
      {error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}
      {guidance && <section aria-label="Your wellness guidance" aria-live="polite" className="space-y-4 border-t border-border pt-4">
        <h2 className="font-semibold text-lg">{guidance.urgency === 'emergency' ? 'Seek emergency help now' : guidance.urgency === 'prompt' ? 'Contact a healthcare professional promptly' : 'General wellness and follow-up'}</h2>
        <p className="text-sm">{guidance.summary}</p>
        {([['General wellness',guidance.wellness],['When to seek professional care',guidance.seekCare],['Questions to discuss',guidance.questions]] as const).map(([title,items]) => items.length ? <div key={title}><h3 className="font-semibold text-sm">{title}</h3><ul className="list-disc pl-5 mt-2 space-y-2 text-sm">{items.map((item,index) => <li key={index}>{item}</li>)}</ul></div> : null)}
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-2">Request context</summary><p className="whitespace-pre-wrap break-words">{submitted}</p></details>
        <p className="text-xs text-muted-foreground">AI can be wrong or incomplete. Normal readings do not rule out serious illness. Follow your clinician’s advice and mission medical protocols.</p>
      </section>}
    </DialogContent>
  </Dialog>;
}