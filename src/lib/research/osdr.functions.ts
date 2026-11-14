import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { limits } from './types';
const origin = 'https://osdr.nasa.gov';
const accession = z.string().trim().regex(/^(?:OSD-|GLDS-)?\d{1,6}$/i).transform(s => s.replace(/^(OSD-|GLDS-)/i, ''));
const object = (v: unknown): Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
async function json(url: string): Promise<unknown> { const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(`NASA request returned HTTP ${r.status}.`); return r.json(); }
export interface StudyFile { name: string; category: string; subcategory: string; bytes: number; url: string; supported: boolean; available: boolean }
function files(payload: unknown, id: string): StudyFile[] {
  const study = object(object(object(payload)['studies'])[`OSD-${id}`]);
  return list(study['study_files']).map(f => { const v = object(f), name = String(v['file_name'] ?? ''), available = v['restricted'] === false && v['visible'] === true; let url = ''; try { const u = new URL(String(v['remote_url'] ?? ''), origin); if (u.origin === origin && u.pathname === `/geode-py/ws/studies/OSD-${id}/download`) url = u.href; } catch { /* Invalid link unavailable. */ } return { name, category: String(v['category'] ?? ''), subcategory: String(v['subcategory'] ?? ''), bytes: Number(v['file_size'] ?? 0), url, available: available && !!url, supported: /\.(csv|tsv|xlsx|json)$/i.test(name) && !/metadata|runsheet|sampletable|contrasts|md5|processing info/i.test(name + ' ' + String(v['subcategory'])) }; });
}
export const searchStudies = createServerFn({ method: 'POST' }).inputValidator(z.object({ term: z.string().trim().max(150) })).handler(async ({ data }) => {
  try { const u = new URL('/osdr/data/search', origin); if (data.term) u.searchParams.set('term', data.term); const raw = object(await json(u.href)); const hits = object(raw['hits']); const studies = list(hits['hits']).filter(h => object(h)['_index'] === 'study').map(h => { const v = object(object(h)['_source']); return { accession: String(v['Accession'] ?? v['Study Identifier'] ?? ''), title: String(v['Study Title'] ?? ''), organism: String(v.Organism ?? v['Characteristics[Organism]'] ?? 'See study metadata'), experiment: String(v['Study Assay Technology Type'] ?? '') }; }); return { studies, error: null }; }
  catch { return { studies: [], error: 'NASA study search is unavailable or timed out. Manual imports remain available.' }; }
});
export const getStudy = createServerFn({ method: 'POST' }).inputValidator(z.object({ accession })).handler(async ({ data }) => {
  try { const [meta, filePayload] = await Promise.all([json(`${origin}/osdr/data/osd/meta/${data.accession}`), json(`${origin}/osdr/data/osd/files/${data.accession}`)]); const root = object(object(object(meta)['study'])[`OSD-${data.accession}`]); const study = object(list(root['studies'])[0]); if (!study['title']) return { study: null, error: 'No study metadata found for that accession.' };
    const categories = new Map(list(study['characteristicCategories']).map(c => [String(object(c)['@id']), String(object(object(c)['characteristicType'])['annotationValue'] ?? '')]));
    const organisms = new Set<string>(); list(object(study['materials'])['samples']).forEach(s => list(object(s)['characteristics']).forEach(c => { const v = object(c); if (/organism/i.test(categories.get(String(object(v['category'])['@id'])) ?? '')) { const value = object(v['value'])['annotationValue'] ?? v['value']; if (typeof value === 'string') organisms.add(value); } }));
    return { study: { accession: `OSD-${data.accession}`, title: String(study['title']), description: String(study['description'] ?? ''), organism: [...organisms].join(', ') || 'Not specified', experiment: list(study['assays']).map(a => String(object(object(a)['technologyType'])['annotationValue'] ?? '')).filter(Boolean).join(', '), files: files(filePayload, data.accession), metadata: JSON.stringify(study, null, 2) }, error: null };
  } catch { return { study: null, error: 'NASA metadata or file listing is unavailable or timed out. Try again or upload a file.' }; }
});
export const downloadStudyFile = createServerFn({ method: 'POST' }).inputValidator(z.object({ accession, name: z.string().min(1).max(300) })).handler(async ({ data }) => {
  try { const available = files(await json(`${origin}/osdr/data/osd/files/${data.accession}`), data.accession); const file = available.find(f => f.name === data.name); if (!file?.available || !file.supported) return { content: null, error: 'This file is unavailable or is not a supported measurement table.' }; if (file.bytes > limits.bytes) return { content: null, error: 'NASA file exceeds 10 MB. Download a subset and upload it manually.' };
    const response = await fetch(file.url, { signal: AbortSignal.timeout(45000) }); if (!response.ok) return { content: null, error: `NASA download failed (HTTP ${response.status}).` }; if (Number(response.headers.get('content-length')) > limits.bytes) return { content: null, error: 'NASA file exceeds 10 MB.' };
    const reader = response.body?.getReader(); if (!reader) throw new Error('Empty download'); const chunks: Uint8Array[] = []; let length = 0; while (true) { const item = await reader.read(); if (item.done) break; length += item['value'].byteLength; if (length > limits.bytes) { await reader.cancel(); return { content: null, error: 'NASA file exceeds 10 MB.' }; } chunks.push(item['value']); } const bytes = new Uint8Array(length); let offset = 0; chunks.forEach(c => { bytes.set(c, offset); offset += c.length; });
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return { content: btoa(binary), error: null };
  } catch { return { content: null, error: 'NASA file download failed or timed out. No dataset was imported.' }; }
});
