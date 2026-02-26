// VibeSphere Media – Design Token System
// Shared across Admin, Client, and Staff apps

export const Colors = {
    // Backgrounds
    bg: '#0a0a0a',
    surface: '#111111',
    surfaceAlt: '#181818',
    border: '#1f1f1f',
    borderLight: '#2a2a2a',

    // Brand
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    primaryGlow: 'rgba(108, 99, 255, 0.15)',

    // Semantic
    success: '#10b981',
    successBg: '#065f46',
    danger: '#ef4444',
    dangerBg: '#991b1b',
    warning: '#f59e0b',

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#888888',
    textFaint: '#444444',

    // Gradients (use with LinearGradient)
    gradientPrimary: ['#6c63ff', '#5a52d5'] as const,
    gradientDark: ['#1a1a2e', '#0a0a0a'] as const,
    gradientCard: ['#1a1a1a', '#111111'] as const,
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const FontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 36,
};

export const Shadow = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    glow: {
        shadowColor: '#6c63ff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
};
