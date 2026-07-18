/**
 * JS-side mirror of the numeric values in `tokens.css`, for the few
 * places React needs a real number (e.g. a `matchMedia` breakpoint
 * check) rather than a CSS custom property. Keep in sync with
 * `tokens.css` by hand — there are only a handful of these.
 */
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
} as const;

export const layout = {
  sidebarWidth: 264,
  sidebarWidthCollapsed: 76,
  topbarHeight: 64,
  maxContentWidth: 1280,
} as const;
