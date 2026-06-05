// Single source of truth for HARDA mobile colours, spacing, typography.
// Tuned for outdoor / high-contrast visibility per the FYP UI brief.

export const colors = {
  // Brand
  primary: '#0F172A',          // deep slate — used on header, splash
  primaryAccent: '#1E40AF',    // action blue
  success: '#15803D',          // green — resolved / verified
  warning: '#F59E0B',          // amber — in_progress
  danger: '#DC2626',           // red — high severity / pothole markers
  muted: '#6B7280',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  // Hazard taxonomy
  pothole: '#DC2626',
  faded_lane_marking: '#F59E0B',
  uneven_surface: '#7C3AED',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.muted },
} as const;

export const hazardColor = (typeName?: string | null) => {
  if (!typeName) return colors.muted;
  return (colors as Record<string, string>)[typeName] ?? colors.muted;
};

export const statusColor = (statusName?: string | null) => {
  switch (statusName) {
    case 'submitted':   return colors.muted;
    case 'verified':    return colors.primaryAccent;
    case 'in_progress': return colors.warning;
    case 'resolved':    return colors.success;
    case 'rejected':    return colors.danger;
    default:            return colors.muted;
  }
};
