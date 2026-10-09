// User.department is free text ("BSIT", "ICT", "TCM Office"); role assignments point at Department.id.
// This is the same approved mapping the backfill in migration 20261005120000 uses (exact match after
// trimming, case-insensitive, no fuzzy matching), so code and data agree on which department a user is in.
// Anything not listed maps to null and grants no department-wide access.

const DEPARTMENT_ALIASES: Readonly<Record<string, string>> = {
  BSIT: 'IT',
  BSMET: 'MET',
  BSTCM: 'TCM',
  BSESM: 'ESM',
  BSNAME: 'NAME',
  IT: 'IT',
  MET: 'MET',
  TCM: 'TCM',
  ESM: 'ESM',
  NAME: 'NAME',
  // Approved 2026-10-05: legacy labels used by existing staff accounts.
  ICT: 'IT',
  'TCM OFFICE': 'TCM'
};

export function toDepartmentId(value: string | null | undefined): string | null {
  const key = String(value ?? '').trim().toUpperCase();
  return key ? DEPARTMENT_ALIASES[key] ?? null : null;
}
