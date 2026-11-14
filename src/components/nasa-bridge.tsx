import { useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getSpaceWeather } from '@/lib/nasa.functions';
import { searchStudies } from '@/lib/research/osdr.functions';
import { readBridgeRequest } from '@/lib/nasa-bridge';

export function NasaBridge() {
  const weather = useServerFn(getSpaceWeather), search = useServerFn(searchStudies);
  useEffect(() => {
    const active = new Set<string>(); let mounted = true;
    const listener = async (event: MessageEvent) => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Astro Health Monitor"]');
      const source = frame?.contentWindow ?? null;
      const data = readBridgeRequest(event, window.location.origin, source);
      if (!data || !source || active.has(data.id) || active.size >= 32) return;
      active.add(data.id);
      let records: unknown[] | null = null, error: string | null = null;
      try {
        if (data.kind === 'search') { const result = await search({ data: { term: data.term } }); records = result.studies; error = result.error; }
        else { const result = await weather({ data: { endpoint: data.endpoint, start: data.start, end: data.end, ...(data.key ? { key: data.key } : {}) } }); records = result.records; error = result.error; }
      } catch { error = 'Source request failed. Please retry.'; }
      if (mounted) source.postMessage({ type: 'astro:nasa-result', id: data.id, records, error }, window.location.origin);
      active.delete(data.id);
    };
    window.addEventListener('message', listener);
    return () => { mounted = false; window.removeEventListener('message', listener); };
  }, [weather, search]);
  return null;
}