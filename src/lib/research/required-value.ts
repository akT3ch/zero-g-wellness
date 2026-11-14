/** Enforces table/array invariants at runtime rather than suppressing missing-value type checks. */
export function requiredValue<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected dataset value is unavailable. Re-import the dataset or reset preparation.');
  return value;
}
