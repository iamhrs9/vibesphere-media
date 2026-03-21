import { DefaultTheme } from '@react-navigation/native';

export const COLORS = {
  ink: '#0A1220',
  primary: '#16233B',
  primarySoft: '#E9F0FB',
  accent: '#4E7BFF',
  accentSoft: '#EDF3FF',
  success: '#14866D',
  successSoft: '#DFF8F0',
  warning: '#C9872B',
  warningSoft: '#FFF2DE',
  danger: '#D35B5B',
  dangerSoft: '#FFE8E8',
  background: '#F3F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9FC',
  border: '#E3E9F1',
  borderStrong: '#CCD6E4',
  text: '#142033',
  textSecondary: '#6D7788',
  textTertiary: '#8F98A8',
  shadow: '#0F172A',
  overlay: 'rgba(10, 18, 32, 0.38)',
  white: '#FFFFFF',
  card: '#FFFFFF',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 20,
  extraLarge: 24,
  radiusSm: 14,
  radius: 20,
  radiusLg: 28,
  radiusPill: 999,
};

export const SHADOWS = {
  soft: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
  strong: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 12,
  },
};

export const NAV_THEME = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.accent,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.danger,
  },
};

export default { COLORS, SIZES, SHADOWS, NAV_THEME };
