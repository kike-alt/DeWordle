export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export function isMobile(width: number): boolean {
  return width < breakpoints.md;
}

export function isTablet(width: number): boolean {
  return width >= breakpoints.md && width < breakpoints.lg;
}

export function isDesktop(width: number): boolean {
  return width >= breakpoints.lg;
}

export function getBreakpoint(width: number): Breakpoint {
  if (width < breakpoints.sm) return 'xs';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  if (width < breakpoints['2xl']) return 'xl';
  return '2xl';
}

export function responsive<T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint,
): T | undefined {
  const orderedBreakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = orderedBreakpoints.indexOf(currentBreakpoint);

  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}
