import { Platform } from 'react-native';

/** Brand palette, derived from the PR Infinity invoice (navy + gold). */
export const colors = {
  primary: '#0B1F4B',
  primaryDark: '#071536',
  primaryLight: '#E8ECF6',
  accent: '#C9952B',
  accentLight: '#FBF3E2',

  background: '#F3F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F6',
  border: '#E1E6EF',
  borderStrong: '#C9D1DE',

  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#8A94A6',
  textInverse: '#FFFFFF',

  pending: '#F08C00',
  pendingBg: '#FFF4E5',
  success: '#1E9E5A',
  successBg: '#E6F6EE',
  danger: '#D9363E',
  dangerBg: '#FDECEC',
  info: '#2F6FED',
  infoBg: '#EAF1FE',
  overlay: 'rgba(7, 21, 54, 0.45)',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  subheading: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
};

export const shadow = Platform.select({
  ios: { shadowColor: '#0B1F4B', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 12px rgba(11,31,75,0.08)' },
}) as object;
