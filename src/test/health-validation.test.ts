import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeEach } from 'vitest';

const source = readFileSync('public/health-ergonomics.js', 'utf8');
const validation = source.slice(source.indexOf('function validateCheckIn()'), source.indexOf("$('#save').onclick = async"));
const validate = new Function('$', 'NUM', 'NAMES', validation + '; return validateCheckIn();');
const select = (selector: string) => document.querySelector(selector);

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