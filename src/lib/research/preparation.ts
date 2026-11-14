import { requiredValue } from '@/lib/research/required-value';
import { numeric } from './import';
import { describe, quantile } from './statistics';
import type { Dataset, VariableType } from './types';
export function inspect(d: Dataset) {
  return d.columns.map(name => { const values = d.rows.map(r => requiredValue(r[name])), missing = values.filter(v => v === null).length, valid = values.map(numeric).filter((v): v is number => v !== null); return { name, type: requiredValue(d.types[name]), missing, percent: d.rows.length ? 100 * missing / d.rows.length : 0, unique: new Set(values.filter(v => v !== null)).size, invalid: requiredValue(d.types[name]) === 'numerical' ? values.filter(v => v !== null && numeric(v) === null).length : 0, stats: requiredValue(d.types[name]) === 'numerical' ? describe(valid) : null, candidate: /group|condition|treatment|cohort/i.test(name) ? 'Potential grouping' : /time|day|date|hour/i.test(name) ? 'Potential time' : '' }; });
}
export type Operation = { kind: 'missing'; column: string } | { kind: 'filter'; column: string; condition: 'equals' | 'greater' | 'less'; value: string } | { kind: 'select'; columns: string[] } | { kind: 'normalize'; column: string; mode: 'z-score' | 'min-max' } | { kind: 'unit'; column: string; conversion: string } | { kind: 'classify'; column: string; type: VariableType };
export const conversions: Record<string, { label: string; unit: string; apply: (n: number) => number }> = {
  'mg-g': { label: 'mg → g', unit: 'g', apply: n => n / 1000 }, 'g-mg': { label: 'g → mg', unit: 'mg', apply: n => n * 1000 }, 'c-f': { label: '°C → °F', unit: '°F', apply: n => n * 9 / 5 + 32 }, 'f-c': { label: '°F → °C', unit: '°C', apply: n => (n - 32) * 5 / 9 }, 'cm-m': { label: 'cm → m', unit: 'm', apply: n => n / 100 },
};
export function prepare(d: Dataset, op: Operation): Dataset {
  const before = d.rows.length; let rows = d.rows.map(r => ({ ...r })), columns = [...d.columns], types = { ...d.types }, units = { ...d.units }, label = '';
  if ('column' in op && !columns.includes(op.column)) throw new Error('Select an available variable.');
  if (op.kind === 'missing') { rows = rows.filter(r => op.column ? requiredValue(r[op.column]) !== null && (requiredValue(types[op.column]) !== 'numerical' || numeric(requiredValue(r[op.column])) !== null) : columns.every(c => requiredValue(r[c]) !== null)); label = `Remove missing/invalid values: ${op.column || 'all columns'}`; }
  if (op.kind === 'filter') { if (!op.value.trim()) throw new Error('Enter a filter value.'); if (op.condition !== 'equals' && !Number.isFinite(Number(op.value))) throw new Error('Numerical filter needs a valid number.'); rows = rows.filter(r => op.condition === 'equals' ? requiredValue(r[op.column]) !== null && String(requiredValue(r[op.column])) === op.value : numeric(requiredValue(r[op.column])) !== null && (op.condition === 'greater' ? Number(requiredValue(r[op.column])) > Number(op.value) : Number(requiredValue(r[op.column])) < Number(op.value))); label = `Filter ${op.column} ${op.condition} ${op.value}`; }
  if (op.kind === 'select') { columns = columns.filter(c => op.columns.includes(c)); if (!columns.length) throw new Error('Keep at least one variable.'); rows = rows.map(r => Object.fromEntries(columns.map(c => [c, requiredValue(r[c])]))); types = Object.fromEntries(columns.map(c => [c, requiredValue(types[c])])); units = Object.fromEntries(columns.filter(c => units[c]).map(c => [c, requiredValue(units[c])])); label = `Keep variables: ${columns.join(', ')}`; }
  if (op.kind === 'normalize' || op.kind === 'unit') {
    if (requiredValue(types[op.column]) !== 'numerical') throw new Error('Select a numerical variable.');
    const s = describe(rows.map(r => numeric(requiredValue(r[op.column]))).filter((v): v is number => v !== null)); if (!s) throw new Error('No valid numerical values.');
    if (op.kind === 'normalize' && (op.mode === 'z-score' ? !s.sd : !s.range)) throw new Error('A constant variable cannot be normalized.');
    const conversion = op.kind === 'unit' ? requiredValue(conversions[op.conversion]) : undefined; if (op.kind === 'unit' && !conversion) throw new Error('Unsupported unit conversion.');
    rows = rows.map(r => { const n = numeric(requiredValue(r[op.column])); return { ...r, [op.column]: n === null ? null : op.kind === 'normalize' ? (op.mode === 'z-score' ? (n - s.mean) / (s.sd ?? 1) : (n - s.min) / s.range) : conversion?.apply(n) ?? n }; });
    units[op.column] = op.kind === 'normalize' ? 'dimensionless' : conversion?.unit ?? ''; label = op.kind === 'normalize' ? `${op.mode} normalization: ${op.column}` : `Unit conversion ${conversion?.label}: ${op.column} (source unit user-confirmed)`;
  }
  if (op.kind === 'classify') { types[op.column] = op.type; label = `Classify ${op.column} as ${op.type}`; }
  if (!rows.length) throw new Error('This operation would remove every observation. Working data is unchanged.');
  return { ...d, rows, columns, types, units, operations: [...d.operations, `${label} · ${before} → ${rows.length} observations`] };
}
export function outliers(d: Dataset, c: string) { const values = d.rows.map(r => numeric(requiredValue(r[c]))).filter((v): v is number => v !== null); if (values.length < 4) throw new Error('Outlier screening needs at least four valid values.'); const q1 = quantile(values, .25), q3 = quantile(values, .75), low = q1 - 1.5 * (q3 - q1), high = q3 + 1.5 * (q3 - q1); return { low, high, count: values.filter(v => v < low || v > high).length }; }
export function reset(d: Dataset): Dataset { const columns = Object.keys(requiredValue(d.original[0]) ?? {}); return { ...d, rows: d.original.map(r => ({ ...r })), columns, types: Object.fromEntries(columns.map(c => [c, d.original.map(r => requiredValue(r[c]))]).map(([c, v]) => [String(c), classifyOriginal(v as import('./types').Cell[])])), operations: [], units: {} }; }
import { classify as classifyOriginal } from './import';
