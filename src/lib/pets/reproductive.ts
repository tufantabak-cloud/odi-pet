import { ReproductiveTest } from '@/components/estrus-tracker/useEstrusDetails'

export function hasComparableAssayMetadata(tests: ReproductiveTest[]): boolean {
  if (!tests || tests.length < 2) return false;

  const firstTest = tests[0];

  // If the first test lacks critical metadata, we can't safely compare
  if (!firstTest.laboratory_name || !firstTest.assay_method || !firstTest.analyzer_name) {
    return false;
  }

  // All subsequent tests must match the first test exactly on these fields
  for (let i = 1; i < tests.length; i++) {
    const test = tests[i];
    if (
      test.laboratory_name !== firstTest.laboratory_name ||
      test.assay_method !== firstTest.assay_method ||
      test.analyzer_name !== firstTest.analyzer_name
    ) {
      return false;
    }
  }

  return true;
}
