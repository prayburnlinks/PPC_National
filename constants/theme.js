/**
 * Theme / Design System
 * Pentecostal Protestant Church app color scheme and typography
 */

export const colors = {
  // Primary Colors - PPC Branding (Blue, White, Red)
  darkBlue: '#0A1F44',        // Deep navy blue
  blue: '#1A3A8F',            // Main blue
  lightBlue: '#2D5BE3',       // Light blue
  red: '#CC1E1E',             // Main red
  darkRed: '#8B0000',         // Deep red
  white: '#FFFFFF',

  // Secondary Colors
  darkGreen: '#1A7A4A',
  green: '#2EAD6F',
  gold: '#D4A017',

  // Neutrals
  background: '#F4F6FB',      // Light blue-tinted background
  surface: '#FFFFFF',
  surfaceLight: '#E8EDF8',
  border: '#D0D9EE',
  textPrimary: '#0A1F44',
  textSecondary: '#4A5878',
  textTertiary: '#8A95B0',
  placeholder: '#B0BAD0',

  // Status Colors
  success: '#2EAD6F',
  error: '#CC1E1E',
  warning: '#D4A017',
  info: '#1A3A8F',

  // Opacity variants
  overlayDark: 'rgba(10, 31, 68, 0.7)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',

  // Aliases so existing code referencing purple/orangeRed still works
  purple: '#1A3A8F',
  lightPurple: '#2D5BE3',
  darkPurple: '#0A1F44',
  orangeRed: '#CC1E1E',
};

export const typography = {
  // Font families (using system fonts)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  // Font sizes
  sizes: {
    xs: 8,
    sm: 10,
    base: 12,
    md: 13,
    lg: 15,
    xl: 17,
    xxl: 20,
    xxxl: 22,
    h1: 26,
    h2: 20,
    h3: 15,
    h4: 13,
  },
  
  // Font weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line heights
  lineHeights: {
    tight: 1.0,
    normal: 1.2,
    relaxed: 1.5,
    loose: 1.8,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 99999,
};

export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
