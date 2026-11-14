import { z } from 'zod';

export const dimensions = ['Mental demand', 'Physical demand', 'Temporal demand', 'Performance difficulty', 'Effort', 'Frustration'] as const;
export const tasks = ['Daily check-in', 'Review urgent status', 'Review trends', 'Complete a task', 'Import measurements', 'Request wellness guidance'] as const;
const rating = z.number().min(0).max(100).multipleOf(5);
export const evaluationSchema = z.object({
  id: z.string(), date: z.string(), task: z.enum(tasks), completed: z.boolean(),
  seconds: z.number().nonnegative().finite(), steps: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(), navigation: z.number().int().nonnegative(),
  workload: z.array(rating).length(6).nullable(), satisfaction: z.number().int().min(1).max(5).nullable(),
});
export type Evaluation = z.infer<typeof evaluationSchema>;
export function rawTlx(values: number[]) {
  if (values.length !== 6 || values.some(value => !Number.isFinite(value) || value < 0 || value > 100)) throw new Error('Six ratings from 0 to 100 are required.');
  return Math.round(values.reduce((sum, value) => sum + value, 0) / 6 * 10) / 10;
}
export function summarize(records: Evaluation[]) {
  if (!records.length) return null;
  const workloads = records.flatMap(record => record.workload ? [rawTlx(record.workload)] : []);
  const satisfaction = records.flatMap(record => record.satisfaction === null ? [] : [record.satisfaction]);
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
  return { completion: Math.round(records.filter(record => record.completed).length / records.length * 100), seconds: average(records.map(record => record.seconds)), steps: average(records.map(record => record.steps)), errors: records.reduce((sum, record) => sum + record.errors, 0), navigation: average(records.map(record => record.navigation)), workload: average(workloads), satisfaction: average(satisfaction) };
}
export const risks = [
  { task: 'Daily check-in', type: 'Checking', error: 'Treat suggested values as measured', cause: 'Defaults resemble readings', consequence: 'Misinterpretation of coverage', priority: 'High impact / plausible', prevention: 'Measured/entered labels and coverage', recovery: 'Review record, replace with confirmation, undo', status: 'Implemented' },
  { task: 'Import measurements', type: 'Selection', error: 'Replace the wrong dates', cause: 'Overlapping CSV records', consequence: 'Loss of original entries', priority: 'High impact / plausible', prevention: 'Date validation and overlap confirmation', recovery: 'Cancel or undo import', status: 'Implemented' },
  { task: 'Review urgent status', type: 'Retrieval', error: 'Miss an action-required area', cause: 'Secondary information competes for attention', consequence: 'Delayed professional contact', priority: 'High impact / plausible', prevention: 'Overall status first; action areas prioritized', recovery: 'Explicit actions and care guidance', status: 'Implemented' },
  { task: 'Complete a task', type: 'Action', error: 'Mark the wrong task complete', cause: 'Similar labels', consequence: 'Incorrect task status', priority: 'Moderate impact / plausible', prevention: 'Named rows, filters and completion feedback', recovery: 'Uncheck/reopen task', status: 'Implemented' },
  { task: 'Request wellness guidance', type: 'Communication', error: 'Share unintended health context', cause: 'Unreviewed readings', consequence: 'Unintended disclosure', priority: 'High impact / plausible', prevention: 'Optional sharing preview and explicit consent', recovery: 'Deselect before sending; sent data cannot be recalled', status: 'Implemented' },
  { task: 'Review urgent status', type: 'Checking', error: 'Rely on implausible live telemetry', cause: 'Feed quality or unit uncertainty', consequence: 'Misleading assessment', priority: 'High impact / unknown likelihood', prevention: 'Source labels and limitations; independent verification needed', recovery: 'Verify with mission medical team', status: 'Needs source validation; medical adapters preserved' },
] as const;