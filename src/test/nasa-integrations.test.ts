import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeFiles, normalizeStudies, studyRecord, downloadUrl } from '@/lib/research/osdr-normalization';
import { nasaJson } from '@/lib/nasa-fetch.server';

function helpers() {
  const root = { localStorage: window.localStorage, location: window.location, parent: {}, addEventListener: vi.fn(), crypto: globalThis.crypto };
  new Function('window', readFileSync('public/nasa-integrations.js', 'utf8'))(root);
  return (root as typeof root & { NasaIntegrations: any }).NasaIntegrations;
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });
describe('OSDR normalization', () => {
  it('prefers exact keys and chooses the newest boundary-matched version', () => {
    expect(studyRecord({ 'OSD-569': { n: 0 }, 'OSD-569.2': { n: 2 } }, '569')).toEqual({ n: 0 });
    expect(studyRecord({ 'OSD-569.1': { n: 1 }, 'OSD-569.2': { n: 2 }, 'OSD-5690': { n: 9 } }, '569')).toEqual({ n: 2 });
    expect(studyRecord({ 'OSD-5690': {} }, '569')).toEqual({});
    expect(studyRecord(null, '569')).toEqual({});
  });
  it.each([[false, true, true], [false, undefined, true], [undefined, true, true], [undefined, undefined, true], [true, true, false], [false, false, false], [true, false, false]])('availability restricted=%s visible=%s', (restricted, visible, available) => {
    expect(normalizeFiles({ studies: { 'OSD-48.1': { study_files: [{ file_name: 'x.csv', remote_url: '/geode-py/ws/studies/OSD-48/download', restricted, visible }] } } }, '48')[0]?.available).toBe(available);
  });
  it.each(['/geode-py/ws/studies/OSD-48/download', '/osdr/data/osd/files/48/table.csv'])('accepts verified study paths %s', path => expect(downloadUrl(path, '48')).toContain(path));
  it.each(['https://evil.test/geode-py/ws/studies/OSD-48/download', 'javascript:alert(1)', '/geode-py/ws/studies/OSD-480/download', '/geode-py/ws/studies/OSD-48/../secret', '/geode-py/ws/studies/OSD-48/%2e%2e/secret'])('rejects unsafe path %s', path => expect(downloadUrl(path, '48')).toBe(''));
  it('accepts versioned study/cgene indices and missing indices, deduplicating accessions', () => {
    const hits = ['study_v2', 'cgene_v3', undefined].map((index, i) => ({ _index: index, _source: { Accession: `OSD-${48 + i}.1`, 'Study Title': 'Actual study' } }));
    expect(normalizeStudies({ hits: { hits: [...hits, hits[0], { _index: 'study', _source: {} }] } }).map(s => s.accession)).toEqual(['OSD-48', 'OSD-49', 'OSD-50']);
  });
});
describe('Cache, keys, UTC and telemetry', () => {
  it('uses exactly 30 minutes and a 15-second connection timeout', () => { const h = helpers(); expect(h.TTL).toBe(1800000); expect(h.timeout).toBe(15000); });
  it('preserves configured keys and uses an empty override for server/DEMO fallback', () => { const h = helpers(); expect(h.readKey()).toBe(''); localStorage.setItem('ahm-ui-nasa-key', 'custom'); expect(h.readKey()).toBe('custom'); expect(localStorage.getItem('ahm-ui-nasa-key')).toBe('custom'); });
  it('uses UTC across month and year boundaries', () => expect(helpers().dateRange(new Date('2027-01-01T01:00:00+02:00'))).toEqual({ start: '2026-12-28', end: '2026-12-31' }));
  it('handles malformed, missing and unavailable storage', () => { const h = helpers(); expect(h.readCache('none')).toBeNull(); localStorage.setItem('bad', '{'); expect(h.readCache('bad')).toBeNull(); vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => { throw new Error(); }); expect(h.readCache('bad')).toBeNull(); });
  it('retains timestamped cache records for stale fallback', () => { const h = helpers(); localStorage.setItem('cache', JSON.stringify({ v: 1, at: Date.now() - 1800001, records: [] })); expect(h.readCache('cache').records).toEqual([]); });
  it.each(['temp', 'press'])('accepts partial %s and prevents snapshot overwrite', parameter => {
    const h = helpers(), state = h.telemetry(); expect(h.update(state, parameter, 22, 'live', 100)).toBe(true);
    expect(state.connection).toBe('live'); expect(h.update(state, parameter, 99, 'snapshot', 200)).toBe(false); expect(state[parameter].value).toBe(22);
    expect(h.update(state, parameter, NaN, 'live')).toBe(false); state.connection = 'disconnected'; h.update(state, parameter, 23, 'live', 300); expect(state.connection).toBe('live');
  });
  it('allows snapshots only for parameters without live data', () => { const h = helpers(), state = h.telemetry(); h.update(state, 'temp', 22, 'live'); h.update(state, 'press', 101.3, 'snapshot'); expect(state.temp.source).toBe('live'); expect(state.press.source).toBe('snapshot'); });
  it('rejects forged bridge replies', () => { const h = helpers(); expect(h.validReply({ origin: 'https://evil.test', source: window, data: { type: 'astro:nasa-result', id: 'x', records: [], error: null } })).toBe(false); });
});
describe('Bounded upstream errors', () => {
  it('respects long Retry-After without retrying or exposing request keys', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '60' } })); vi.stubGlobal('fetch', fetcher);
    await expect(nasaJson('https://api.nasa.gov/?api_key=private')).rejects.toThrow('rate limit'); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not retry permanent errors or malformed responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 403 })); vi.stubGlobal('fetch', fetcher); await expect(nasaJson('https://api.nasa.gov')).rejects.toThrow('403'); expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(new Response('{}')); await expect(nasaJson('https://api.nasa.gov')).rejects.toThrow('invalid');
  });
});