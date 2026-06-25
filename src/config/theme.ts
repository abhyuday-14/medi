// MediTrack Theme System for Accessibility and Customization

export type ThemeMode = 'light' | 'dark';
export type ContrastMode = 'normal' | 'high';
export type FontSizeScale = 'normal' | 'large' | 'extra-large';

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
}

export const COLORS: Record<ThemeMode, Record<ContrastMode, ColorPalette>> = {
  light: {
    normal: {
      primary: '#3B82F6', // Soothing Blue
      primaryLight: '#EFF6FF',
      success: '#10B981', // Emerald
      successLight: '#D1FAE5',
      warning: '#F59E0B', // Amber
      warningLight: '#FEF3C7',
      danger: '#EF4444', // Red
      dangerLight: '#FEE2E2',
      background: '#F8F9FA', // Soft off-white
      card: '#FFFFFF', // Pure White
      text: '#1A1D1F', // Deep Charcoal
      textSecondary: '#6F767E', // Soft Gray
      border: 'transparent', // Remove hard borders for premium look
    },
    high: {
      primary: '#1D4ED8', // High contrast blue
      primaryLight: '#DBEAFE',
      success: '#008000', // Pure Green
      successLight: '#E0F0E0',
      warning: '#D97706', // Strong Amber
      warningLight: '#FFF3E0',
      danger: '#D00000', // Pure Red
      dangerLight: '#FFE0E0',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#000000', // Pitch Black
      textSecondary: '#333333',
      border: '#000000', // Strong black borders
    },
  },
  dark: {
    normal: {
      primary: '#3B82F6', // Blue 500
      primaryLight: '#1E3A8A',
      success: '#34D399', // Emerald 400
      successLight: '#064E3B',
      warning: '#FBBF24', // Amber 400
      warningLight: '#78350F',
      danger: '#F87171', // Red 400
      dangerLight: '#7F1D1D',
      background: '#0F172A', // Slate 900
      card: '#1E293B', // Slate 800
      text: '#F8FAFC', // Slate 50
      textSecondary: '#94A3B8', // Slate 400
      border: '#334155', // Slate 700
    },
    high: {
      primary: '#8080FF', // High visibility dark blue
      primaryLight: '#000080',
      success: '#00FF00', // Neon Green
      successLight: '#003300',
      warning: '#FFFF00', // Neon Yellow
      warningLight: '#333300',
      danger: '#FF0000', // Neon Red
      dangerLight: '#330000',
      background: '#000000', // Pure Black
      card: '#121212',
      text: '#FFFFFF', // Pure White
      textSecondary: '#DDDDDD',
      border: '#FFFFFF', // Pure White border
    },
  },
};

// Font Scaling Factor for Seniors
export const getFontScale = (scale: FontSizeScale): number => {
  switch (scale) {
    case 'large':
      return 1.25;
    case 'extra-large':
      return 1.5;
    case 'normal':
    default:
      return 1.0;
  }
};

// Accessibility Touch Target sizes
export const TOUCH_TARGET = {
  minHeight: 48,
  minWidth: 48,
  padding: 12,
};
