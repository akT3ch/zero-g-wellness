import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeEach } from 'vitest';
import { SPACE_CHALLENGE_RISKS, OSDR_RISK_STUDIES, SIMULATED_DATASETS, getStudiesForRisk, getUniqueCuratedAccessions } from '@/lib/research/space-challenge-risks';

const source = readFileSync('public/health-ergonomics.js', 'utf8');
const validation = source.slice(source.indexOf('function validateCheckIn()'), source.indexOf("$('#save').onclick = async"));
const validate = new Function('$', 'NUM', 'NAMES', validation + '; return validateCheckIn();');
const select = (selector: string) => document.querySelector(selector);
const prioritySource = source.slice(source.indexOf('function priorityOrder('), source.indexOf('renderOv = function()'));
const prioritize = new Function(prioritySource + '; return priorityOrder;')();
const taskSource = source.slice(source.indexOf('function taskVisible('), source.indexOf('const appearance ='));
const visibleTask = new Function(taskSource + '; return taskVisible;')();
const risksEvalSource = source.slice(source.indexOf('const SPACE_RISKS_11 ='), source.indexOf('let riskFilter ='));
const evalRisks = new Function('f1', risksEvalSource + '; return { evaluateSpaceRisks, CREW_SCENARIOS, SPACE_RISKS_11, BODY_REGION_TO_RISKS };')((x: number) => Math.round(x * 10) / 10);
const trendSource = source.slice(source.indexOf('const domainTrendKeys ='), source.indexOf('const trendDialog ='));
const chartTools = new Function('NUM', 'NAMES', 'esc', 'f1', 'CK', 'DN', 'mean', 'getPreference', 'setPreference', trendSource + '; return { trendTicks, trendBaseline, trendExplanation, buildTrendChart, measurementSource, measurementTimestamp, missionDayForDate };')(
  [['hr', 'Resting heart rate', 'bpm', 40, 140, 1, 62]],
  { hr: 'Resting heart rate', mood: 'Mood (10 = very good)' },
  (value: unknown) => String(value),
  (x: number) => Math.round(x * 10) / 10,
  [['vision', 'Vision change'], ['head', 'Head pressure'], ['dizzy', 'Dizziness or coordination problems']],
  ['Cardiovascular'],
  (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length,
  () => '',
  () => {},
);
const backupSource = source.slice(source.indexOf('function validatePersonalBackup('), source.indexOf('function trendExplanation('));
const validateBackup = new Function('LIMIT', 'keys', 'CK', 'NUM', 'SL', backupSource + '; return validatePersonalBackup;')(600, ['hr', 'mood'], [['vision', 'Vision change']], [['hr', 'Resting heart rate', 'bpm']], [['mood', 'Mood', 7]]) as (value: unknown) => Record<string, unknown>[];

describe('11 Spaceflight Risks, OSDR mapping & simulated datasets', () => {
  it('maps all 8 anatomical body regions to valid risks across all 11 spaceflight risks', () => {
    const regions = Object.keys(evalRisks.BODY_REGION_TO_RISKS).sort();
    expect(regions).toEqual(['bone', 'brain', 'eye', 'gut', 'heart', 'immun', 'muscle', 'rad']);
    const validKeys = new Set(evalRisks.SPACE_RISKS_11.map((r: { key: string }) => r.key));
    const coveredKeys = new Set<string>();
    for (const rKey of regions) {
      const mapped = evalRisks.BODY_REGION_TO_RISKS[rKey];
      expect(mapped.length).toBeGreaterThanOrEqual(2);
      for (const k of mapped) {
        expect(validKeys.has(k)).toBe(true);
        coveredKeys.add(k);
      }
    }
    expect(coveredKeys.size).toBe(11);
  });

  it('covers all 11 spaceflight risks from Risks.md, 20 OSDR study mappings, and 4 simulated dataset exports', () => {
    expect(SPACE_CHALLENGE_RISKS).toHaveLength(11);
    expect(OSDR_RISK_STUDIES).toHaveLength(20);
    expect(SIMULATED_DATASETS).toHaveLength(4);
    expect(evalRisks.SPACE_RISKS_11).toHaveLength(11);
    for (let i = 1; i <= 11; i++) {
      expect(getStudiesForRisk(i).length).toBeGreaterThanOrEqual(1);
    }
    expect(getUniqueCuratedAccessions()).toContain('OSD-569');
    expect(getUniqueCuratedAccessions()).toContain('OSD-684');
    expect(getUniqueCuratedAccessions()).toContain('OSD-474');
  });

  it('evaluates nominal baseline crew at 100 readiness with all 11 risks green (level 0)', () => {
    const res = evalRisks.evaluateSpaceRisks(evalRisks.CREW_SCENARIOS.nominal.values, 1);
    expect(res.readiness).toBe(100);
    expect(res.results.every((r: { l: number }) => r.l === 0)).toBe(true);
  });

  it('flags SANS (Risk #10) as Act (level 2) and Bone Changes (Risk #11) as Watch (level 1) in AST-01 scenario', () => {
    const res = evalRisks.evaluateSpaceRisks(evalRisks.CREW_SCENARIOS.ast01.values, 1);
    expect(res.results[9].key).toBe('sans_neuroocular');
    expect(res.results[9].l).toBe(2);
    expect(res.results[10].key).toBe('bone_changes');
    expect(res.results[10].l).toBe(1);
  });

  it('flags Decompression Sickness (Risk #4) and Spacewalk EVA Injury (Risk #8) as Act (level 2) in AST-03 scenario', () => {
    const res = evalRisks.evaluateSpaceRisks(evalRisks.CREW_SCENARIOS.ast03.values, 1);
    expect(res.results[3].key).toBe('decompression_sickness');
    expect(res.results[3].l).toBe(2);
    expect(res.results[7].key).toBe('eva_injury_performance');
    expect(res.results[7].l).toBe(2);
  });
});

describe('Task view filtering', () => {
  it('shows only incomplete tasks in Open and complete tasks in Completed while All includes both', () => {
    expect(visibleTask(false, 'open')).toBe(true);
    expect(visibleTask(true, 'open')).toBe(false);
    expect(visibleTask(true, 'completed')).toBe(true);
    expect(visibleTask(false, 'completed')).toBe(false);
    expect(visibleTask(true, 'all')).toBe(true);
    expect(visibleTask(false, 'all')).toBe(true);
  });
});

describe('Existing assessment prioritization', () => {
  it('puts action-required level 2 before warning level 1 and normal level 0 without changing ties', () => {
    expect(prioritize([0, 1, 2, 1, 0, 2])).toEqual([2, 5, 1, 3, 0, 4]);
  });
});

describe('Overview trend charts', () => {
  const entries = [
    { d: '2026-11-01', hr: 58, mood: 7 },
    { d: '2026-11-02', hr: 64, mood: 6 },
    { d: '2026-11-03', hr: 72, mood: 8 },
  ];

  it('produces evenly spaced round tick values covering the range', () => {
    expect(chartTools.trendTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(chartTools.trendTicks(55, 75, 5)).toEqual([55, 60, 65, 70, 75]);
  });

  it('labels both axes of the enlarged chart with the measurement, unit and check-in dates', () => {
    const svg = chartTools.buildTrendChart('hr', entries, true);
    expect(svg).toContain('Resting heart rate (bpm)');
    expect(svg).toContain('Date of check-in');
    expect(svg).toContain('2026-11-01');
    expect(svg).toContain('2026-11-03');
    expect(svg).toContain('role="img"');
    expect(svg).not.toContain('stroke-dasharray="5 4"');
  });

  it('labels subjective scales with the 1–10 scale and keeps sparklines decorative without axis text', () => {
    expect(chartTools.buildTrendChart('mood', entries, true)).toContain('Mood (10 = very good) (scale 1–10)');
    const sparkline = chartTools.buildTrendChart('hr', entries, false);
    expect(sparkline).toContain('aria-hidden="true"');
    expect(sparkline).not.toContain('Date of check-in');
  });

  it('only shows a personal baseline when five measurements of that value are available', () => {
    const fourEntries = entries.concat({ d: '2026-11-04', hr: 68, mood: 7 });
    const fiveEntries = fourEntries.concat({ d: '2026-11-05', hr: 70, mood: 6 });
    expect(chartTools.trendBaseline('hr', fourEntries)).toBeNull();
    expect(chartTools.buildTrendChart('hr', fourEntries, true)).not.toContain('stroke-dasharray="5 4"');
    expect(chartTools.trendBaseline('hr', fiveEntries)).toBe(66.4);
    expect(chartTools.buildTrendChart('hr', fiveEntries, true)).toContain('stroke-dasharray="5 4"');
    expect(chartTools.trendBaseline('vision', fiveEntries)).toBeNull();
  });

  it('explains the numerical comparison and distinguishes it from a medical assessment', () => {
    expect(chartTools.trendExplanation('hr', entries)).toContain('Change compared with your previous recorded value (2026-11-02): +8 bpm');
    expect(chartTools.trendExplanation('hr', entries)).toContain('not a diagnosis or medical assessment');
    expect(chartTools.trendExplanation('hr', entries)).toContain('your recorded history');
    expect(chartTools.trendExplanation('vision', [
      { d: '2026-11-01', vision: false },
      { d: '2026-11-02', vision: true },
    ])).toContain('not a diagnosis');
  });

  it('shows measurement source and time and derives mission-day context without editing records', () => {
    expect(chartTools.measurementSource({ src: { hr: 'BLE chest strap' } }, 'hr')).toBe('Device: BLE chest strap');
    expect(chartTools.measurementSource({ origin: 'Demo data' }, 'hr')).toBe('Demo data');
    expect(chartTools.measurementTimestamp({ provenance: { hr: { measuredAt: '2026-11-14T09:30:00.000Z' } } }, 'hr')).not.toBe('Time not recorded');
    expect(chartTools.missionDayForDate('2026-11-14', '2026-11-10')).toBe('Day +4');
    expect(chartTools.missionDayForDate('2026-11-08', '2026-11-10')).toBe('Day -2');
    expect(chartTools.missionDayForDate('2026-11-14', '')).toBe('');
  });
});

describe('Local health backup validation', () => {
  it('accepts versioned backups and legacy arrays while marking missing provenance', () => {
    const backup = validateBackup({
      format: 'zero-g-wellness-local-health-log',
      version: 1,
      entries: [
        { d: '2026-11-02', hr: 64, origin: 'Personal check-in', provenance: { hr: { source: 'Manual entry', measuredAt: '2026-11-02T09:00:00.000Z' } } },
        { d: '2026-11-01', hr: 60 }
      ]
    });
    expect(backup.map(row => row['d'])).toEqual(['2026-11-01', '2026-11-02']);
    expect(backup[0]?.['origin']).toBe('Imported local health backup');
    expect(backup[1]?.['origin']).toBe('Personal check-in');
    expect(backup[1]?.['provenance']).toEqual({ hr: { source: 'Manual entry', measuredAt: '2026-11-02T09:00:00.000Z' } });
    expect(validateBackup([{ d: '2026-11-03', hr: 62 }])[0]?.['origin']).toContain('Legacy backup');
  });

  it('rejects duplicate dates, invalid values, unsupported envelopes and oversized data', () => {
    expect(() => validateBackup([{ d: '2026-11-01', hr: 60 }, { d: '2026-11-01', hr: 61 }])).toThrow('more than one entry');
    expect(() => validateBackup([{ d: '2026-11-01', hr: '60' }])).toThrow('invalid numeric value');
    expect(() => validateBackup({ format: 'other', version: 1, entries: [{ d: '2026-11-01' }] })).toThrow();
    expect(() => validateBackup(Array(601).fill({ d: '2026-11-01', hr: 60 }))).toThrow('1 to 600');
  });
});

describe('Check-in validation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="n_d" type="date" required value="2026-11-14"><input id="n_hr" type="number" min="40" max="140" step="1" value="62"><div id="form-error" class="hide"></div>';
  });

  it('requires a date before an entry can be saved', () => {
    const date = document.querySelector<HTMLInputElement>('#n_d');
    if (!date) throw new Error('Missing date field');
    date.value = '';
    expect(validate(select, [['hr']], { hr: 'Resting heart rate' })).toBe(false);
  });

  it('rejects a heart rate beyond the original form limit of 140 bpm', () => {
    const pulse = document.querySelector<HTMLInputElement>('#n_hr');
    if (!pulse) throw new Error('Missing heart rate field');
    pulse.value = '141';
    expect(validate(select, [['hr']], { hr: 'Resting heart rate' })).toBe(false);
    pulse.value = '140';
    expect(validate(select, [['hr']], { hr: 'Resting heart rate' })).toBe(true);
  });

  it('allows an unmeasured numeric field to stay empty', () => {
    const pulse = document.querySelector<HTMLInputElement>('#n_hr');
    if (!pulse) throw new Error('Missing heart rate field');
    pulse.value = '';
    expect(validate(select, [['hr']], { hr: 'Resting heart rate' })).toBe(true);
  });
});