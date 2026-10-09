// A Research Focal Person works on one department (User.department). Department
// values are stored inconsistently across records ("IT", "IT Department",
// "Information Technology" via Department.id/name, Group.department/dept), so
// compare normalized forms of every candidate the record has.

export function normalizeDepartmentScope(value: string | null | undefined) {
  return (value ?? '')
    .toUpperCase()
    .replace(/\bDEPARTMENT\b|\bDEPT\.?\b|\bPROGRAM\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isInDepartmentScope(scope: string | null | undefined, candidates: Array<string | null | undefined>) {
  const normalizedScope = normalizeDepartmentScope(scope);
  if (!normalizedScope) return false;
  return candidates.some((candidate) => normalizeDepartmentScope(candidate) === normalizedScope);
}
