export type ThemeMode = 'dark' | 'light';

export const darkTheme = {
  mode: 'dark' as ThemeMode,
  bg: '#000000',
  card: '#111111',
  border: '#222222',
  text: '#ffffff',
  muted: '#a1a1aa',
  muted2: '#71717a',
  primary: '#9333ea',
  primarySoft: '#a855f7',
  primaryLight: '#c084fc',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  inputBg: '#000000',
};

export const lightTheme = {
  mode: 'light' as ThemeMode,
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#0f172a',
  muted: '#64748b',
  muted2: '#94a3b8',
  primary: '#7c3aed',
  primarySoft: '#8b5cf6',
  primaryLight: '#a78bfa',
  danger: '#ef4444',
  success: '#059669',
  warning: '#d97706',
  inputBg: '#f1f5f9',
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
};

export type AppTheme = typeof darkTheme;
export default darkTheme;