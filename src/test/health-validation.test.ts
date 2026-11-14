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
const evalRisks = new Function('f1', risksEvalSource + '; return { evaluateSpaceRisks, CREW_SCENARIOS, SPACE_RISKS_11 };')((x: number) => Math.round(x * 10) / 10);
const trendSource = source.slice(source.indexOf('function trendTicks('), source.indexOf('const trendDialog ='));
const chartTools = new Function('NUM', 'NAMES', 'base', 'esc', 'f1', trendSource + '; return { trendTicks, buildTrendChart };')(
  [['hr', 'Resting heart rate', 'bpm', 40, 140, 1, 62]],
  { hr: 'Resting heart rate', mood: 'Mood (10 = very good)' },
  () => ({ hr: 60 }),
  (value: unknown) => String(value),
  (x: number) => Math.round(x * 10) / 10,
);

describe('11 Spaceflight Risks, OSDR mapping & simulated datasets', () => {
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
    expect(svg).toContain('stroke-dasharray="5 4"');
  });

  it('labels subjective scales with the 1–10 scale and keeps sparklines decorative without axis text', () => {
    expect(chartTools.buildTrendChart('mood', entries, true)).toContain('Mood (10 = very good) (scale 1–10)');
    const sparkline = chartTools.buildTrendChart('hr', entries, false);
    expect(sparkline).toContain('aria-hidden="true"');
    expect(sparkline).not.toContain('Date of check-in');
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