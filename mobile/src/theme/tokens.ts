/**
 * Design tokens aligned with the Stitch-designed mobile screens.
 * Matches the web portal Material Design color system.
 */
export const tokens = {
  // Core brand
  primary: "#000511",
  onPrimary: "#ffffff",
  primaryContainer: "#001e40",
  onPrimaryContainer: "#6f87ae",

  secondary: "#006a63",
  onSecondary: "#ffffff",
  secondaryContainer: "#99efe5",
  onSecondaryContainer: "#006f67",

  // Surfaces
  background: "#fef9f1",
  surface: "#fef9f1",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f8f3eb",
  surfaceContainer: "#f2ede5",
  surfaceContainerHigh: "#ece8e0",
  surfaceContainerHighest: "#e6e2da",

  // On-surface
  onBackground: "#1d1c17",
  onSurface: "#1d1c17",
  onSurfaceVariant: "#44474e",
  outline: "#74777f",
  outlineVariant: "#c4c6cf",

  // Error
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  // Tertiary (amber/brown for Atse Fasil)
  tertiaryContainer: "#371400",
  onTertiaryContainer: "#d16923",
  tertiaryFixed: "#ffdbca",
  tertiaryFixedDim: "#ffb68e",

  // Legacy aliases kept for backward compatibility
  canvas: "#fef9f1",
  ink: "#1d1c17",
  muted: "#74777f",
  accent: "#006a63",
  accentMuted: "#99efe5",
  eyebrowAccent: "#006a63",
  surfaceElevated: "#ffffff",
  dangerBg: "#ffdad6",
  dangerInk: "#ba1a1a",
  warningBg: "#ffdbca",
  warningInk: "#d16923",

  // Radii
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusPill: 9999,

  // Shadows
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
