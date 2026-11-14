import { requiredValue } from '@/lib/research/required-value';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { limits, type Cell, type Dataset, type Row, type Source, type VariableType } from './types';
export function numeric(value: Cell | undefined): number | null {
  if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
function cell(value: unknown): Cell {
  if (value == null || (typeof value === 'string' && /^(\s*|NA|N\/A|NaN|null)$/i.test(value.trim()))) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error('Nested JSON values are unsupported. Use a flat array of observation objects.');
}
export function classify(values: Cell[]): VariableType {
  const present = values.filter(v => v !== null);
  if (!present.length) return 'categorical';
  if (present.every(v => typeof v === 'boolean' || v === 'true' || v === 'false')) return 'boolean';
  if (present.every(v => numeric(v) !== null)) return 'numerical';
  if (present.every(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|\s|$)/.test(v) && Number.isFinite(Date.parse(v)))) return 'date/time';
  return 'categorical';
}
export function fromRows(input: unknown[], name: string, source: Source = 'User Upload', reference = name, warnings: string[] = []): Dataset {
  if (!input.length) throw new Error('No observations found. Include a header and at least one data row.');
  if (input.length > limits.rows) throw new Error('Dataset exceeds 50,000 rows. Import a smaller subset.');
  if (input.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('JSON must be an array of flat observation objects.');
  const columns = [...new Set(input.flatMap(r => Object.keys(r as object)))];
  if (!columns.length || columns.length > limits.columns || columns.length * input.length > limits.cells) throw new Error('Dataset must have 1–250 columns and at most 2 million cells.');
  if (columns.some(c => ['__proto__', 'constructor', 'prototype'].includes(c))) throw new Error('Unsupported column name. Rename reserved object-property names.');
  const original: Row[] = input.map(r => Object.fromEntries(columns.map(c => [c, cell((r as Record<string, unknown>)[c])])));
  const types = Object.fromEntries(columns.map(c => [c, classify(original.map(r => requiredValue(r[c])))]));
  return { id: crypto.randomUUID(), name, source, reference, importedAt: new Date().toISOString(), columns, original, rows: original.map(r => ({ ...r })), types, operations: [], warnings, units: {} };
}
function matrixRows(matrix: unknown[][]): { rows: Row[]; warnings: string[] } {
  const [header, ...body] = matrix;
  if (!header) throw new Error('File is empty.');
  const warnings: string[] = [];
  const names = header.map((h, i) => { if (h == null || String(h).trim() === '') { warnings.push(`Unnamed column ${i + 1} assigned Column ${i + 1}.`); return `Column ${i + 1}`; } return String(h).trim(); });
  if (new Set(names).size !== names.length) throw new Error('Duplicate headers found. Every column needs a unique name.');
  if (body.some(r => r.length > names.length)) throw new Error('A row has more fields than the header. Check delimiters or quoted values.');
  return { rows: body.filter(r => r.some(v => v != null && String(v).trim() !== '')).map(r => Object.fromEntries(names.map((n, i) => [n, cell(r[i])]))), warnings };
}
export function parseText(text: string, name: string, source: Source = 'User Upload', reference = name): Dataset {
  text = text.replace(/^\uFEFF/, '');
  if (text.includes('\uFFFD')) throw new Error('Text encoding could not be read. Save the file as UTF-8 and try again.');
  if (/\.json$/i.test(name)) {
    let parsed: unknown; try { parsed = JSON.parse(text); } catch { throw new Error('Invalid JSON syntax.'); }
    if (!Array.isArray(parsed)) throw new Error('JSON must contain an array of observation objects.');
    return fromRows(parsed, name, source, reference);
  }
  if (!/\.(csv|tsv)$/i.test(name)) throw new Error('Supported formats: CSV, TSV, XLSX and JSON.');
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', delimiter: /\.tsv$/i.test(name) ? '\t' : '' });
  const errors = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter');
  if (errors.length) throw new Error(`Malformed delimited file: ${requiredValue(errors[0])?.message}`);
  const table = matrixRows(parsed.data); return fromRows(table.rows, name, source, reference, table.warnings);
}
export function readWorkbook(buffer: ArrayBuffer) {
  try { const book = XLSX.read(buffer, { type: 'array', cellDates: true }); if (!book.SheetNames.length) throw new Error(); return book; }
  catch { throw new Error('Excel file could not be read. Use an unencrypted XLSX workbook.'); }
}
export function parseWorkbook(buffer: ArrayBuffer, name: string, sheet?: string, source: Source = 'User Upload', reference = name) {
  const book = readWorkbook(buffer); const selected = sheet || requiredValue(book.SheetNames[0]); const page = selected ? requiredValue(book.Sheets[selected]) : undefined;
  if (!page) throw new Error('Worksheet not found.');
  const table = matrixRows(XLSX.utils.sheet_to_json<unknown[]>(page, { header: 1, defval: null, blankrows: false }));
  return fromRows(table.rows, `${name} · ${selected}`, source, reference, table.warnings);
}
export async function parseFile(file: File, sheet?: string) {
  if (file.size > limits.bytes) throw new Error('File exceeds the 10 MB import limit.');
  if (/\.xlsx$/i.test(file.name)) return parseWorkbook(await file.arrayBuffer(), file.name, sheet);
  return parseText(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()), file.name);
}
