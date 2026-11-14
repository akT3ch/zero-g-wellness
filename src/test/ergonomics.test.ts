import { describe, expect, it } from 'vitest';
import { evaluationSchema, rawTlx, summarize } from '@/lib/ergonomics';

describe('Task evaluation metrics', () => {
  it('averages exactly six 0–100 workload dimensions without weighting', () => {
    expect(rawTlx([0, 20, 40, 60, 80, 100])).toBe(50);
    expect(() => rawTlx([20, 30])).toThrow();
    expect(() => rawTlx([0, 20, 40, 60, 80, 101])).toThrow();
  });
  it('has no metrics when there are no measurements', () => {
    expect(summarize([])).toBeNull();
  });
  it('keeps missing subjective feedback absent instead of counting it as zero', () => {
    const record = evaluationSchema.parse({ id: '1', date: '2026-11-14', task: 'Daily check-in', completed: true, seconds: 30, steps: 2, errors: 0, navigation: 1, workload: null, satisfaction: null });
    expect(summarize([record])).toEqual({ completion: 100, seconds: 30, steps: 2, errors: 0, navigation: 1, workload: null, satisfaction: null });
  });
});