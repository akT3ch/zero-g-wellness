import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('public/body-anatomy.js', 'utf8');
const anatomy = new Function('window', source + '; return window.BodyAnatomy;')({});
const measured = (entry: { meas?: Record<string, boolean> }, key: string) => entry.meas?.[key] === true;

describe('Anatomy measurement coverage', () => {
  it('keeps unmeasured or partly measured cardiovascular data unavailable, never normal', () => {
    expect(anatomy.status('heart', { l: 0 }, undefined, measured)).toBe('n');
    expect(anatomy.status('heart', { l: 0 }, { hr: 62, meas: { hr: true } }, measured)).toBe('n');
    expect(anatomy.status('heart', { l: 0 }, { hr: 62, sys: 118, dia: 76, spo2: 97, meas: { hr: true, sys: true, dia: true, spo2: true } }, measured)).toBe(0);
  });
  it('preserves WATCH and ACT from existing evaluation even with incomplete coverage', () => {
    expect(anatomy.status('heart', { l: 1 }, undefined, measured)).toBe(1);
    expect(anatomy.status('heart', { l: 2 }, undefined, measured)).toBe(2);
  });
  it('does not treat an absence of reported eye symptoms as a measured normal examination', () => {
    expect(anatomy.status('eye', { l: 0 }, { vision: false, head: false }, measured)).toBe('n');
  });
  it('retains all eight original region mappings', () => {
    expect(Object.keys(anatomy.fields).sort()).toEqual(['bone', 'brain', 'eye', 'gut', 'heart', 'immun', 'muscle', 'rad']);
  });
});