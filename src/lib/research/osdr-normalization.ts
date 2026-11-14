export const object = (v: unknown): Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
export function normalizeBiologicalDatasets(payload: unknown) {
  const seen = new Set<string>();
  return list(payload).flatMap((value) => {
    const row = object(value), rawAccession = row['id.accession'];
    if (typeof rawAccession !== 'string') return [];
    const match = /^(?:OSD-|GLDS-)?(\d{1,6})(?:\.\d+)?$/i.exec(rawAccession.trim());
    if (!match) return [];
    const field = (name: string) => {
      const value = row[name];
      return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    };
    const dataset = {
      accession: `OSD-${match[1]}`,
      spaceflight: field('study.factor value.spaceflight'),
      organism: field('study.characteristics.organism'),
      tissue: field('study.factor value.tissue'),
    };
    const key = [dataset.accession, dataset.spaceflight, dataset.organism, dataset.tissue].join('\0');
    if (seen.has(key)) return [];
    seen.add(key);
    return [dataset];
  });
}
export function studyRecord(payload: unknown, id: string) {
  const records = object(payload), prefix = `OSD-${id}`, exact = Object.keys(records).find(key => key.toUpperCase() === prefix);
  if (exact) return object(records[exact]);
  const versions = Object.keys(records).filter(key => key.toUpperCase().startsWith(`${prefix}.`));
  versions.sort((a, b) => {
    const aVersion = Number(a.slice(prefix.length + 1)), bVersion = Number(b.slice(prefix.length + 1));
    return Number.isFinite(aVersion) && Number.isFinite(bVersion)
      ? bVersion - aVersion
      : b.localeCompare(a, undefined, { numeric: true });
  });
  return object(versions[0] ? records[versions[0]] : undefined);
}
export function downloadUrl(value: unknown, id: string): string {
  if (typeof value !== 'string' || /\\|(?:^|\/)(?:\.|%2e){1,2}(?:\/|%2f|$)/i.test(value) || /%2f|%5c/i.test(value)) return '';
  try {
    const u = new URL(value, 'https://osdr.nasa.gov');
    if (u.origin !== 'https://osdr.nasa.gov' || u.username || u.password || u.hash) return '';
    const safe = new RegExp(`^/geode-py/ws/studies/OSD-${id}(?:\\.\\d+)?/`).test(u.pathname)
      || new RegExp(`^/osdr/data/osd/files/(?:OSD-)?${id}(?:\\.\\d+)?(?:/|$)`).test(u.pathname);
    return safe ? u.href : '';
  } catch { return ''; }
}
export function normalizeFiles(payload: unknown, id: string) {
  return list(studyRecord(object(payload)['studies'], id)['study_files']).map(f => {
    const v = object(f), name = String(v['file_name'] ?? ''), url = downloadUrl(v['remote_url'], id);
    return { name, category: String(v['category'] ?? ''), subcategory: String(v['subcategory'] ?? ''), bytes: Number(v['file_size'] ?? 0), url,
      available: v['restricted'] !== true && v['visible'] !== false && !!url,
      supported: /\.(csv|tsv|xlsx|json)$/i.test(name) && !/metadata|runsheet|sampletable|contrasts|md5|processing info/i.test(name + ' ' + String(v['subcategory'])) };
  });
}
export function normalizeStudies(payload: unknown) {
  const raw = object(payload), hits = object(raw['hits']);
  const seen = new Set<string>();
  return list(hits['hits'] ?? raw['studies'] ?? raw['data']).flatMap(h => {
    const hit = object(h), v = object(hit['_source'] ?? hit['source'] ?? h);
    const a = v['Accession'] ?? v['Study Identifier'] ?? v['accession'];
    const title = v['Study Title'] ?? v['study_title'] ?? v['title'];
    const index = String(hit['_index'] ?? '');
    if ((!/^(study|cgene)/i.test(index) && !(a && title)) || typeof a !== 'string' || typeof title !== 'string' || !title.trim()) return [];
    const match = /^(?:OSD-|GLDS-)?(\d{1,6})(?:\.\d+)?$/i.exec(a.trim());
    if (!match || seen.has(String(match[1]))) return [];
    seen.add(String(match[1]));
    return [{ accession: `OSD-${match[1]}`, title, organism: String(v['Organism'] ?? v['Characteristics[Organism]'] ?? 'See study metadata'), experiment: String(v['Study Assay Technology Type'] ?? '') }];
  });
}