import { requiredValue } from '@/lib/research/required-value';
import { jStat } from 'jstat';
import { numeric } from './import';
import type { Dataset, Result } from './types';
export function quantile(values: number[], p: number) { const a = values.slice().sort((x, y) => x - y); if (!a.length) return NaN; const i = (a.length - 1) * p, lo = Math.floor(i); return requiredValue(a[lo]) + ((a[lo + 1] ?? requiredValue(a[lo])) - requiredValue(a[lo])) * (i - lo); }
export function describe(values: number[]) {
  const n = values.length; if (!n) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : null;
  const min = Math.min(...values), max = Math.max(...values);
  return { n, mean, median: quantile(values, .5), sd: variance === null ? null : Math.sqrt(variance), variance, min, max, range: max - min, q1: quantile(values, .25), q3: quantile(values, .75) };
}
export function ranks(values: number[]) {
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v); const out = Array(values.length).fill(0) as number[];
  for (let i = 0; i < sorted.length;) { let j = i + 1; while (j < sorted.length && requiredValue(sorted[j]).v === requiredValue(sorted[i]).v) j++; for (let k = i; k < j; k++) out[requiredValue(sorted[k]).i] = (i + 1 + j) / 2; i = j; } return out;
}
export function pearson(a: number[], b: number[]) {
  if (a.length !== b.length || a.length < 3) throw new Error('Correlation needs at least three complete pairs.');
  const ma = describe(a)?.mean ?? 0, mb = describe(b)?.mean ?? 0;
  const sa = a.reduce((s, v) => s + (v - ma) ** 2, 0), sb = b.reduce((s, v) => s + (v - mb) ** 2, 0);
  if (!sa || !sb) throw new Error('Correlation is undefined for constant variables.');
  return Math.max(-1, Math.min(1, a.reduce((s, v, i) => s + (v - ma) * (requiredValue(b[i]) - mb), 0) / Math.sqrt(sa * sb)));
}
export function spearman(a: number[], b: number[]) { return pearson(ranks(a), ranks(b)); }
const bounded = (p: number) => Math.max(0, Math.min(1, p));
function tP(t: number, df: number) { return bounded(2 * (1 - jStat.studentt.cdf(Math.abs(t), df))); }
const baseLimitations = ['Exploratory analysis; statistical significance is not biological significance.', 'Independence and sampling design cannot be verified from this table alone.'];
export function correlation(d: Dataset, x: string, y: string, rank = false): Result {
  if (x === y) throw new Error('Choose two different variables.');
  const pairs = d.rows.map(r => [numeric(requiredValue(r[x])), numeric(requiredValue(r[y]))]).filter((p): p is [number, number] => requiredValue(p[0]) !== null && requiredValue(p[1]) !== null);
  const a = pairs.map(p => p[0]), b = pairs.map(p => p[1]), r = rank ? spearman(a, b) : pearson(a, b), n = pairs.length, df = n - 2;
  const t = Math.abs(r) === 1 ? Infinity : r * Math.sqrt(df / (1 - r * r));
  const ci: [number, number] | undefined = !rank && n > 3 && Math.abs(r) < 1 ? [Math.tanh(Math.atanh(r) - 1.96 / Math.sqrt(n - 3)), Math.tanh(Math.atanh(r) + 1.96 / Math.sqrt(n - 3))] : undefined;
  return { method: rank ? 'Spearman rank correlation' : 'Pearson correlation', variables: [x, y], n, excluded: d.rows.length - n, statistic: r, df, p: tP(t, df), effect: r, effectLabel: rank ? 'rho' : 'r', ...(ci ? { ci } : {}), details: { 'Two-sided t approximation': t }, limitations: [...baseLimitations, 'Correlation does not establish causation.', ...(rank ? ['P-value uses a large-sample t approximation with average ranks for ties, not an exact permutation test.'] : ['Pearson inference assumes independent, approximately bivariate-normal observations.'])] };
}
export function descriptive(d: Dataset, y: string): Result {
  const values = d.rows.map(r => numeric(requiredValue(r[y]))).filter((v): v is number => v !== null), s = describe(values);
  if (!s) throw new Error('No valid numerical observations for this variable.');
  return { method: 'Descriptive statistics', variables: [y], n: s.n, excluded: d.rows.length - s.n, details: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v ?? 'Undefined for n < 2'])), limitations: ['Sample variance and standard deviation use n − 1.', 'Missing and nonnumeric values are excluded explicitly.'] };
}
function tieSum(values: number[]) { const counts = new Map<number, number>(); values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1)); return [...counts.values()].reduce((s, t) => s + t ** 3 - t, 0); }
export function compareGroups(d: Dataset, y: string, group: string, method: 'welch' | 'paired' | 'mann' | 'anova' | 'kruskal', independent: boolean, normal: boolean, pairId = ''): Result {
  if (!independent) throw new Error('Confirm the study design before inferential testing.');
  if (['welch', 'paired', 'anova'].includes(method) && !normal) throw new Error('Review approximate normality (paired differences for paired tests) and confirm before a parametric test. Otherwise use a rank test.');
  const complete = d.rows.filter(r => requiredValue(r[group]) !== null && numeric(requiredValue(r[y])) !== null);
  const names = [...new Set(complete.map(r => String(requiredValue(r[group]))))].sort();
  if (names.length < 2 || (['welch', 'paired', 'mann'].includes(method) && names.length !== 2)) throw new Error('This test needs ' + (['welch', 'paired', 'mann'].includes(method) ? 'exactly two' : 'at least two') + ' nonempty groups.');
  let arrays = names.map(g => complete.filter(r => String(requiredValue(r[group])) === g).map(r => numeric(requiredValue(r[y])) ?? 0));
  let excluded = d.rows.length - complete.length;
  if (method === 'paired') {
    if (!pairId || pairId === group || pairId === y) throw new Error('Select a separate subject/pair ID variable.');
    const pairMaps = names.map(g => { const map = new Map<string, number>(); for (const r of complete.filter(r => String(requiredValue(r[group])) === g)) { if (requiredValue(r[pairId]) === null) continue; const id = String(requiredValue(r[pairId])); if (map.has(id)) throw new Error('Duplicate subject IDs within a group; pairs cannot be established.'); map.set(id, numeric(requiredValue(r[y])) ?? 0); } return map; });
    const ids = [...requiredValue(pairMaps[0]).keys()].filter(id => requiredValue(pairMaps[1]).has(id)); arrays = pairMaps.map(m => ids.map(id => m.get(id) ?? 0)); excluded = d.rows.length - ids.length * 2;
  }
  if (arrays.some(a => a.length < 3)) throw new Error('At least three valid observations per group (or three complete pairs) are required for this exploratory MVP.');
  const stats = arrays.map(a => describe(a)); if (stats.some(s => !s)) throw new Error('No valid groups.');
  const ns = arrays.map(a => a.length), n = ns.reduce((a, b) => a + b, 0), k = arrays.length;
  const means = arrays.map(a => describe(a)?.mean ?? 0), vars = arrays.map(a => describe(a)?.variance ?? 0);
  const details: Record<string, number | string> = Object.fromEntries(names.flatMap((g, i) => [[`${g} n`, requiredValue(ns[i])], [`${g} mean`, requiredValue(means[i])]]));
  const result: Result = { method: '', variables: [y, group, ...(method === 'paired' ? [pairId] : [])], n: method === 'paired' ? requiredValue(ns[0]) : n, excluded, details, limitations: [...baseLimitations, method === 'paired' ? 'n counts complete subject pairs; incomplete pairs excluded.' : 'n counts observations, not inferred biological replicates.', 'No post-hoc comparisons performed; all p-values are unadjusted single-test values.'] };
  if (method === 'welch' || method === 'paired') {
    const differences = method === 'paired' ? requiredValue(arrays[0]).map((v, i) => v - requiredValue(requiredValue(arrays[1])[i])) : [];
    const ds = describe(differences), delta = method === 'paired' ? ds?.mean ?? 0 : requiredValue(means[0]) - requiredValue(means[1]);
    const se2 = method === 'paired' ? (ds?.variance ?? 0) / requiredValue(ns[0]) : requiredValue(vars[0]) / requiredValue(ns[0]) + requiredValue(vars[1]) / requiredValue(ns[1]);
    if (se2 <= 0) throw new Error('Zero sampling variance; this t-test is undefined.');
    const df = method === 'paired' ? requiredValue(ns[0]) - 1 : se2 ** 2 / ((requiredValue(vars[0]) / requiredValue(ns[0])) ** 2 / (requiredValue(ns[0]) - 1) + (requiredValue(vars[1]) / requiredValue(ns[1])) ** 2 / (requiredValue(ns[1]) - 1));
    const t = delta / Math.sqrt(se2), margin = jStat.studentt.inv(.975, df) * Math.sqrt(se2);
    return { ...result, method: method === 'paired' ? 'Paired t-test' : 'Welch independent-samples t-test', statistic: t, df, p: tP(t, df), effect: delta, effectLabel: `Mean difference (${requiredValue(names[0])} − ${requiredValue(names[1])})`, ci: [delta - margin, delta + margin] };
  }
  if (method === 'mann') {
    const all = arrays.flat(), rank = ranks(all), u = rank.slice(0, requiredValue(ns[0])).reduce((a, b) => a + b, 0) - requiredValue(ns[0]) * (requiredValue(ns[0]) + 1) / 2;
    const variance = requiredValue(ns[0]) * requiredValue(ns[1]) / 12 * (n + 1 - tieSum(all) / (n * (n - 1)));
    if (variance <= 0) throw new Error('All observations are tied; rank inference is undefined.');
    const z = Math.max(0, Math.abs(u - requiredValue(ns[0]) * requiredValue(ns[1]) / 2) - .5) / Math.sqrt(variance);
    return { ...result, method: 'Mann–Whitney U (tie-corrected normal approximation)', statistic: u, p: bounded(2 * (1 - jStat.normal.cdf(z, 0, 1))), effect: 2 * u / (requiredValue(ns[0]) * requiredValue(ns[1])) - 1, effectLabel: 'Rank-biserial correlation (first group higher = positive)', limitations: [...result.limitations, 'Continuity-corrected asymptotic p-value, not exact; small samples need specialist review.', 'Distribution comparison; a median shift requires similarly shaped distributions.'] };
  }
  if (method === 'anova') {
    const positive = vars.filter(v => v > 0); if (positive.length !== vars.length || Math.max(...positive) / Math.min(...positive) > 4) throw new Error('ANOVA variance screen failed (zero variance or max/min ratio > 4). Use Kruskal–Wallis or specialist analysis.');
    const grand = describe(arrays.flat())?.mean ?? 0, between = means.reduce((s, m, i) => s + requiredValue(ns[i]) * (m - grand) ** 2, 0), within = vars.reduce((s, v, i) => s + (requiredValue(ns[i]) - 1) * v, 0), f = (between / (k - 1)) / (within / (n - k));
    return { ...result, method: 'One-way ANOVA', statistic: f, df: [k - 1, n - k], p: bounded(1 - jStat.centralF.cdf(f, k - 1, n - k)), effect: between / (between + within), effectLabel: 'Eta squared', limitations: [...result.limitations, 'Variance ratio ≤ 4 is a screening heuristic, not proof of homoscedasticity.'] };
  }
  const all = arrays.flat(), rank = ranks(all); let offset = 0;
  const sum = arrays.reduce((s, a) => { const rs = rank.slice(offset, offset + a.length).reduce((a, b) => a + b, 0); offset += a.length; return s + rs ** 2 / a.length; }, 0);
  const correction = 1 - tieSum(all) / (n ** 3 - n); if (correction <= 0) throw new Error('All values tied.');
  const h = Math.max(0, (12 * sum / (n * (n + 1)) - 3 * (n + 1)) / correction);
  return { ...result, method: 'Kruskal–Wallis (tie-corrected)', statistic: h, df: k - 1, p: bounded(1 - jStat.chisquare.cdf(h, k - 1)), effect: Math.max(0, (h - k + 1) / (n - k)), effectLabel: 'Epsilon squared', limitations: [...result.limitations, 'Chi-square approximation may be unreliable for small groups; similar distributions required for a location interpretation.'] };
}
export function temporal(d: Dataset, time: string, y: string, group = ''): Result {
  const rows = d.rows.map(r => ({ x: requiredValue(d.types[time]) === 'date/time' ? (requiredValue(r[time]) === null ? null : Date.parse(String(requiredValue(r[time]))) / 86400000) : numeric(requiredValue(r[time])), y: numeric(requiredValue(r[y])), group: group ? String(requiredValue(r[group]) ?? 'Missing group') : 'All observations' })).filter((r): r is { x: number; y: number; group: string } => r.x !== null && Number.isFinite(r.x) && r.y !== null);
  const details: Record<string, number | string> = {}; const groups = [...new Set(rows.map(r => r.group))];
  for (const g of groups) { const a = rows.filter(r => r.group === g).sort((a, b) => a.x - b.x); if (a.length < 3 || new Set(a.map(r => r.x)).size < 2) throw new Error(`Trend for ${g} needs ≥3 valid observations and ≥2 time points.`); const mx = describe(a.map(r => r.x))?.mean ?? 0, my = describe(a.map(r => r.y))?.mean ?? 0; const slope = a.reduce((s, r) => s + (r.x - mx) * (r.y - my), 0) / a.reduce((s, r) => s + (r.x - mx) ** 2, 0); details[`${g} slope per ${requiredValue(d.types[time]) === 'date/time' ? 'day' : 'time unit'}`] = slope; details[`${g} n`] = a.length; details[`${g} first-to-last change`] = requiredValue(a[a.length - 1]).y - requiredValue(a[0]).y; }
  return { method: 'Exploratory linear time trends', variables: [time, y, ...(group ? [group] : [])], n: rows.length, excluded: d.rows.length - rows.length, details, limitations: ['Slopes are descriptive, not evidence of a causal effect.', 'Repeated observations, autocorrelation and ties in time are not modeled; no inferential p-value is reported.'] };
}
export function holm(pValues: number[]) { const sorted = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p), out = Array(pValues.length).fill(0) as number[]; let previous = 0; sorted.forEach(({ p, i }, rank) => { previous = Math.max(previous, bounded(p * (sorted.length - rank))); out[i] = previous; }); return out; }
