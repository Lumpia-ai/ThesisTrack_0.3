export const DEPARTMENT_THEME: Record<string, { color: string; tint: string; icon: string }> = {
  IT: { color: '#003A8F', tint: '#EFF6FF', icon: 'fa-laptop-code' },
  MET: { color: '#B45309', tint: '#FFFBEB', icon: 'fa-industry' },
  TCM: { color: '#6D28D9', tint: '#F5F3FF', icon: 'fa-broadcast-tower' },
  ESM: { color: '#15803D', tint: '#F0FDF4', icon: 'fa-bolt' },
  NAME: { color: '#0E7490', tint: '#ECFEFF', icon: 'fa-ship' }
};

export const DEFAULT_DEPARTMENT_THEME = { color: '#334155', tint: '#F1F5F9', icon: 'fa-file-lines' };

export function getDepartmentTheme(department: string | null | undefined) {
  if (!department) return DEFAULT_DEPARTMENT_THEME;
  return DEPARTMENT_THEME[department.toUpperCase()] || DEFAULT_DEPARTMENT_THEME;
}
