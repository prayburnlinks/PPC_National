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
  green: '#1A7F51',           // was #2EAD6F — darkened so green text passes AA on white
  gold: '#D4A017',

  // Neutrals
  background: '#F4F6FB',      // Light blue-tinted background
  surface: '#FFFFFF',
  surfaceLight: '#E8EDF8',
  border: '#D0D9EE',
  textPrimary: '#0A1F44',
  textSecondary: '#4A5878',
  textTertiary: '#5F6B8A',       // was #8A95B0 (3.0:1) — now 5.3:1 on white
  placeholder: '#6F7A96',        // was #B0BAD0 (1.9:1)

  // Soft tints for icon chips and badges
  blueTint: '#E8EDF8',
  redTint: '#FDECEC',
  goldTint: '#FBF3DC',
  greenTint: '#E6F5EC',

  // Status Colors
  success: '#1A7F51',
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
  
  // Sizes — floor raised from 8pt to 11pt and body from 12pt to 14pt for readability
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    h1: 28,
    h2: 20,
    h3: 16,
    h4: 14,
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 99999,
};

// Soft, blue-tinted shadows (never pure black)
export const shadows = {
  none: {
    shadowColor: '#0A1F44',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0A1F44',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0A1F44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0A1F44',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
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
