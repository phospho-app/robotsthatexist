/**
 * Budget Configuration
 *
 * This file contains the standardized budget ranges used across the application.
 * Modify these ranges here to update them throughout the entire system.
 */

export const BUDGET_RANGES = [
  "Less than $500",
  "$500-$1,000",
  "$1,000-$2,000",
  "$2,000-$3,000",
  "$3,000-$5,000",
  "$5,000-$10,000",
  "$10K-$20K",
  "$20K-$50K",
  "$50K-$100K",
  "$100K+",
] as const;

export type BudgetRange = (typeof BUDGET_RANGES)[number];

/**
 * Helper function to check if a value is a valid budget range
 */
export function isValidBudgetRange(value: string): value is BudgetRange {
  return BUDGET_RANGES.includes(value as BudgetRange);
}

/**
 * Helper function to get all budget options including "Not specified" for optional selections
 */
export function getBudgetOptionsWithEmpty(): Array<{
  value: string;
  label: string;
}> {
  return [
    { value: "", label: "Not specified" },
    ...BUDGET_RANGES.map((range) => ({ value: range, label: range })),
  ];
}

/**
 * Helper function to get all budget options without empty option (for required fields)
 */
export function getBudgetOptions(): Array<{ value: string; label: string }> {
  return BUDGET_RANGES.map((range) => ({ value: range, label: range }));
}
