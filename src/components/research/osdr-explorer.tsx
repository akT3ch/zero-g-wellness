import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Search, Download, ExternalLink, ShieldAlert, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStudy, searchStudies, downloadStudyFile } from '@/lib/research/osdr.functions';
import { parseText, parseWorkbook } from '@/lib/research/import';
import { SPACE_CHALLENGE_RISKS, SIMULATED_DATASETS } from '@/lib/research/space-challenge-risks';
import type { Dataset } from '@/lib/research/types';

type Study = NonNullable<Awaited<ReturnType<typeof getStudy>>['study']>;

export function OsdrExplorer({ onImport }: { onImport: (d: Dataset) => void }) {
  const [term, setTerm] = useState('OSD-48');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [study, setStudy] = useState<Study | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<number>(0);
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchStudies>>['studies']>([]);
  const search = useServerFn(searchStudies);
  const metadata = useServerFn(getStudy);
  const download = useServerFn(downloadStudyFile);

  async function load(accession: string) {
    setTerm(accession);
    setBusy('Loading study');
    setError('');
    try {
      const r = await metadata({ data: { accession } });
      setStudy(r.study);
      if (r.error) setError(r.error);
    } catch {
      setError('NASA study request failed. Check the accession and retry.');
    } finally {
      setBusy('');
    }
  }

  async function loadSimulatedCsv(item: (typeof SIMULATED_DATASETS)[number]) {
    setBusy('Loading ' + item.name);
    setError('');
    try {
      const res = await fetch(item.path);
      if (!res.ok) throw new Error('Could not load generated dataset ' + item.path);
      const text = await res.text();
      const d = parseText(text, item.id + '.csv', 'Example Dataset', item.path);
      onImport(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dataset import failed.');
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const osd = params.get('osd');
      const riskParam = params.get('risk');
      const simParam = params.get('sim');
      if (riskParam && Number.isFinite(Number(riskParam))) {
        setSelectedRisk(Number(riskParam));
      }
      if (simParam) {
        const found = SIMULATED_DATASETS.find(s => s.id === simParam);
        if (found) void loadSimulatedCsv(found);
      } else if (osd && /^(OSD-|GLDS-)?\d+$/i.test(osd.trim())) {
        void load(osd.trim());
      }
    } catch {
      /* Ignore URL parsing errors in non-browser environments */
    }
  }, []);

  async function find() {
    if (/^(OSD-|GLDS-)?\d+$/i.test(term.trim())) return load(term.trim());
    setBusy('Searching NASA');
    setError('');
    try {
      const r = await search({ data: { term } });
      setHits(r.studies);
      setStudy(null);
      if (r.error) setError(r.error);
      else if (!r.studies.length) setError('No studies in this search response. Try an accession number.');
    } catch {
      setError('NASA search failed. Manual import remains available.');
    } finally {
      setBusy('');
    }
  }

  async function importFile(name: string) {
    if (!study) return;
    setBusy('Downloading ' + name);
    setError('');
    try {
      const r = await download({ data: { accession: study.accession, name } });
      if (!r.content) {
        setError(r.error || 'Empty download.');
        return;
      }
      const bytes = Uint8Array.from(atob(r.content), c => c.charCodeAt(0));
      const ref = `${study.accession} / ${name}`;
      const d = /\.xlsx$/i.test(name)
        ? parseWorkbook(bytes.buffer, name, undefined, 'NASA OSDR', ref)
        : parseText(new TextDecoder('utf-8', { fatal: true }).decode(bytes), name, 'NASA OSDR', ref);
      onImport(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NASA file import failed.');
    } finally {
      setBusy('');
    }
  }

  const visible =
    study?.files.filter(f =>
      `${f.name} ${f.category} ${f.subcategory}`.toLowerCase().includes(filter.toLowerCase()),
    ) ?? [];

  const filteredRisks =
    selectedRisk === 0
      ? SPACE_CHALLENGE_RISKS
      : SPACE_CHALLENGE_RISKS.filter(r => r.riskNumber === selectedRisk);

  return (
    <section className="border-t border-border pt-6">
      <div className="mb-8 rounded-lg border border-border bg-muted/20 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Database className="size-5 text-primary" aria-hidden="true" />
          Simulated Spaceflight Datasets (`simulate_health_data.py`)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Load synthetic longitudinal crew time-series (AST-01, AST-02, AST-03), 15-minute intraday telemetry, or measurement prompts directly into the statistical analysis pipeline.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SIMULATED_DATASETS.map(sim => (
            <article key={sim.id} className="flex flex-col justify-between rounded-md border border-border bg-background p-4">
              <div>
                <h3 className="text-sm font-semibold">{sim.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{sim.description}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void loadSimulatedCsv(sim)}>
                  <Download />
                  Import into Research Workspace
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-border bg-muted/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
              Curated NASA Spaceflight Risks · OSDR Reference Studies (11 Risks)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct mapping between the 11 spaceflight health risks, NASA Standard Measures, and verified NASA Open Science Data Repository (OSDR) studies.
            </p>
          </div>
          <label className="text-xs font-medium">
            Filter by risk
            <select
              aria-label="Filter curated OSDR studies by risk"
              className="mt-1 block h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedRisk}
              onChange={e => setSelectedRisk(Number(e.target.value))}
            >
              <option value={0}>All 11 Spaceflight Risks (20 study mappings)</option>
              {SPACE_CHALLENGE_RISKS.map(r => (
                <option key={r.riskNumber} value={r.riskNumber}>
                  #{r.riskNumber} · {r.nameEn} ({r.studies.length} OSDR)
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredRisks.map(risk => (
            <article key={risk.riskNumber} className="rounded-md border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-primary">Risk #{risk.riskNumber}</span>
                  <h3 className="text-sm font-semibold">{risk.nameEn}</h3>
                  <p className="text-xs text-muted-foreground">{risk.nameDe}</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {risk.studies.length} {risk.studies.length === 1 ? 'study' : 'studies'}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{risk.summaryEn}</p>
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {risk.studies.map((s, idx) => (
                  <div
                    key={`${s.osdId}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {s.osdId} · {s.studyTitle}
                      </p>
                      <p className="text-muted-foreground">{s.contentAndMetrics}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Standard Measures: {s.nlspReferenceStudy}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void load(s.osdId)}
                    >
                      Load {s.osdId}
                    </Button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <h2 className="text-lg font-semibold">NASA OSDR Data Explorer</h2>
      <form
        className="my-4 flex flex-wrap gap-3"
        onSubmit={e => {
          e.preventDefault();
          void find();
        }}
      >
        <Input
          aria-label="NASA accession or search term"
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="OSD-48 or keyword"
          className="min-w-0 flex-1"
          maxLength={150}
        />
        <Button disabled={!!busy}>
          <Search />
          Search NASA
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={!!busy}
          onClick={() => {
            setTerm('');
            setBusy('Discovering studies');
            void search({ data: { term: '' } })
              .then(r => {
                setHits(r.studies);
                setStudy(null);
                setError(r.error ?? '');
              })
              .catch(() => setError('Discovery unavailable.'))
              .finally(() => setBusy(''));
          }}
        >
          Discover studies
        </Button>
      </form>
      {busy && (
        <p role="status" className="my-3 text-sm">
          {busy}…
        </p>
      )}
      {error && (
        <p role="alert" className="my-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {hits.length > 0 && !study && (
        <div>
          {hits.map((h, i) => (
            <article
              key={h.accession + i}
              className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {h.accession} · {h.experiment}
                </p>
                <h3 className="mt-1 font-medium">{h.title}</h3>
              </div>
              <Button variant="outline" disabled={!!busy} onClick={() => void load(h.accession)}>
                Inspect study
              </Button>
            </article>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">
            Showing studies returned in the current NASA search response, not the entire repository.
          </p>
        </div>
      )}
      {study && (
        <>
          <div className="border-l-4 border-primary pl-4">
            <p className="text-sm text-primary">{study.accession} · NASA OSDR</p>
            <h3 className="my-2 text-lg font-semibold">{study.title}</h3>
            <p className="text-sm">
              {study.organism} · {study.experiment}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{study.description}</p>
            <Button asChild variant="link" className="mt-2 px-0">
              <a
                href={`https://osdr.nasa.gov/bio/repo/data/studies/${study.accession}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open NASA study
                <ExternalLink />
              </a>
            </Button>
          </div>
          <details className="my-4">
            <summary className="cursor-pointer text-sm font-medium">
              Actual study metadata (not measurement data)
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-xs">
              {study.metadata}
            </pre>
          </details>
          <div className="my-4 flex flex-wrap justify-between gap-4">
            <h3 className="font-semibold">Study files · {study.files.length}</h3>
            <Input
              aria-label="Filter NASA files"
              placeholder="Filter files"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            CSV / TSV / XLSX / JSON tables up to 10 MB. Metadata and processing manifests are not
            measurements. Compatibility is screened by file labels; verify scientific meaning
            before analysis.
          </p>
          <div className="max-h-[480px] overflow-auto">
            {visible.map(f => (
              <article
                key={f.name}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium">{f.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.category} · {f.subcategory} · {(f.bytes / 1024).toFixed(1)} KB ·{' '}
                    {f.available ? 'Public download' : 'Unavailable/restricted'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!busy || !f.supported || !f.available || f.bytes > 10 * 1024 * 1024}
                  onClick={() => void importFile(f.name)}
                >
                  <Download />
                  Import table
                </Button>
                {f.available && (
                  <Button asChild variant="ghost" size="icon">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Download ${f.name}`}
                      title="Open original download"
                    >
                      <ExternalLink />
                    </a>
                  </Button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
