import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  primary: '#0F172A',
  primaryLight: '#1E293B',
  secondary: '#64748B',
  accent: '#0F172A',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  red: '#EF4444',
  green: '#22C55E',
  blue: '#3B82F6',
  amber: '#F59E0B',

  redLight: '#FEF2F2',
  greenLight: '#F0FDF4',
  amberLight: '#FFFBEB',
  blueLight: '#EFF6FF',

  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  bg: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  overlay: 'rgba(0,0,0,0.5)',
};

export const SPACING = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  huge: 32,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  title: 28,
  hero: 32,
};

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.black,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: COLORS.black,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  xl: {
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  bottom: {
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
};

export const SCREEN = {
  width,
  height,
  isSmallDevice: width < 375,
};

export const TYPOGRAPHY = {
  h1: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.extrabold, lineHeight: 32 },
  h2: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, lineHeight: 28 },
  h3: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, lineHeight: 24 },
  subtitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, lineHeight: 22 },
  body: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.regular, lineHeight: 20 },
  caption: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.regular, lineHeight: 16 },
  label: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, lineHeight: 14 },
  price: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.error },
  oldPrice: { fontSize: FONT_SIZES.sm, textDecorationLine: 'line-through', color: COLORS.gray400 },
};
