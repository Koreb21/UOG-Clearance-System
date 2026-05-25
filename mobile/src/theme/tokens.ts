/**
 * Design tokens aligned with the Stitch-designed mobile screens.
 * Matches the web portal Material Design color system.
 * Supports both light and dark modes.
 */

export type TokenSet = {
  // Core brand
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Surfaces
  background: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  // On-surface
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;

  // Error
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Success
  success: string;

  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary
  tertiaryContainer: string;
  onTertiaryContainer: string;
  tertiaryFixed: string;
  tertiaryFixedDim: string;

  // Radii
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusXl: number;
  radiusPill: number;

  // Shadows
  shadowSoft: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  shadowMd: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

const radii = {
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusPill: 9999,
} as const;

const shadows = {
  shadowSoft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  shadowMd: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

// ── Light tokens (existing warm cream palette) ──
export const lightTokens: TokenSet = {
  ...radii,
  ...shadows,

  primary: "#000511",
  onPrimary: "#ffffff",
  primaryContainer: "#001e40",
  onPrimaryContainer: "#6f87ae",

  secondary: "#006a63",
  onSecondary: "#ffffff",
  secondaryContainer: "#99efe5",
  onSecondaryContainer: "#006f67",

  background: "#fef9f1",
  surface: "#fef9f1",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f8f3eb",
  surfaceContainer: "#f2ede5",
  surfaceContainerHigh: "#ece8e0",
  surfaceContainerHighest: "#e6e2da",

  onBackground: "#1d1c17",
  onSurface: "#1d1c17",
  onSurfaceVariant: "#44474e",
  outline: "#74777f",
  outlineVariant: "#c4c6cf",

  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  success: "#2e7d32",

  tertiaryContainer: "#371400",
  onTertiaryContainer: "#d16923",
  tertiaryFixed: "#ffdbca",
  tertiaryFixedDim: "#ffb68e",
};

// ── Dark tokens (cool dark navy/black palette) ──
export const darkTokens: TokenSet = {
  ...radii,
  ...shadows,

  primary: "#d5e3ff",
  onPrimary: "#001e40",
  primaryContainer: "#3a5f94",
  onPrimaryContainer: "#a7c8ff",

  secondary: "#5de0d0",
  onSecondary: "#003630",
  secondaryContainer: "#006a63",
  onSecondaryContainer: "#99efe5",

  background: "#000000",
  surface: "#0d0f14",
  surfaceContainerLowest: "#000000",
  surfaceContainerLow: "#14161c",
  surfaceContainer: "#1c1e24",
  surfaceContainerHigh: "#24262d",
  surfaceContainerHighest: "#2c2e36",

  onBackground: "#e0e2ec",
  onSurface: "#e0e2ec",
  onSurfaceVariant: "#a6abb6",
  outline: "#8f9199",
  outlineVariant: "#3f4148",

  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",

  success: "#81c784",

  tertiaryContainer: "#ffb68e",
  onTertiaryContainer: "#371400",
  tertiaryFixed: "#371400",
  tertiaryFixedDim: "#d16923",
};

// ── Legacy aliases (kept for backward compat, point to light by default) ──
export const tokens = lightTokens;

// Dark-mode specific legacy aliases
export const darkLegacy = {
  canvas: darkTokens.background,
  ink: darkTokens.onSurface,
  muted: darkTokens.onSurfaceVariant,
  accent: darkTokens.secondary,
  accentMuted: darkTokens.secondaryContainer,
  eyebrowAccent: darkTokens.secondary,
  surfaceElevated: darkTokens.surfaceContainerLow,
  dangerBg: darkTokens.errorContainer,
  dangerInk: darkTokens.error,
  warningBg: darkTokens.tertiaryContainer,
  warningInk: darkTokens.onTertiaryContainer,
};
