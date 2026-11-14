export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
export type VariableType = 'numerical' | 'categorical' | 'boolean' | 'date/time';
export type Source = 'NASA OSDR' | 'User Upload' | 'Example Dataset';
export interface Dataset { id: string; name: string; source: Source; reference: string; importedAt: string; columns: string[]; original: Row[]; rows: Row[]; types: Record<string, VariableType>; operations: string[]; warnings: string[]; units: Record<string, string> }
export interface Result { method: string; variables: string[]; n: number; excluded: number; statistic?: number; df?: number | [number, number]; p?: number; effect?: number; effectLabel?: string; ci?: [number, number]; details: Record<string, number | string>; limitations: string[] }
export const limits = { bytes: 10 * 1024 * 1024, rows: 50000, columns: 250, cells: 2000000 };
