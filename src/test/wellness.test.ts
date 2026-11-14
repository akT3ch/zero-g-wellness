import { describe, expect, it } from 'vitest';
import { emergencyGuidance, wellnessInputSchema, guidanceSchema, wellnessInstructions } from '@/lib/wellness';

const valid = { symptoms: 'Mild fatigue since yesterday.', mission: 'Space station (LEO)', readings: [], consent: true, emergency: false };
describe('Wellness safety boundaries', () => {
  it('requires explicit consent to share symptoms', () => {
    expect(wellnessInputSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(wellnessInputSchema.safeParse(valid).success).toBe(true);
  });
  it('limits shared history to seven check-ins', () => {
    const reading = { date: '2026-11-14', values: [], symptoms: [] };
    expect(wellnessInputSchema.safeParse({ ...valid, readings: Array(8).fill(reading) }).success).toBe(false);
    expect(wellnessInputSchema.safeParse({ ...valid, readings: Array(7).fill(reading) }).success).toBe(true);
  });
  it('provides immediate emergency advice without waiting for a model', () => {
    expect(emergencyGuidance.urgency).toBe('emergency');
    expect(guidanceSchema.safeParse(emergencyGuidance).success).toBe(true);
  });
  it('requires professional-care guidance in every response', () => {
    expect(guidanceSchema.safeParse({ ...emergencyGuidance, seekCare: [] }).success).toBe(false);
  });
  it('sets diagnosis and medication boundaries for the model', () => {
    expect(wellnessInstructions).toContain('Never diagnose, prescribe medication, change medication doses');
  });
});