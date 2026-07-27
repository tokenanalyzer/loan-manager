import type { Transition, Variants } from 'framer-motion';

/**
 * JS-side mirror of `tokens.css`'s `--motion-*` custom properties —
 * Framer Motion needs real numbers/arrays, not CSS variables, for its
 * `transition`/`variants` props. Keep both in sync by hand, same
 * convention `theme.ts` already uses for layout numbers. Durations are
 * in seconds (Framer Motion's unit), matching the ms values in CSS
 * (fast 120ms / base 200ms / slow 320ms).
 */
export const durations = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
} as const;

export const easings = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
} as const;

export const transitions = {
  standard: { duration: durations.base, ease: easings.standard } satisfies Transition,
  enter: { duration: durations.base, ease: easings.decelerate } satisfies Transition,
  exit: { duration: durations.fast, ease: easings.accelerate } satisfies Transition,
} as const;

/** Simple opacity fade — dropdowns, alerts, page-level content swaps. */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.enter },
  exit: { opacity: 0, transition: transitions.exit },
};

/** Fade + rise — cards, list items, anything entering from "below." */
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.enter },
  exit: { opacity: 0, y: 8, transition: transitions.exit },
};

/** Fade + slide from the right — drawers, the mobile sidebar. */
export const slideInRightVariants: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: transitions.enter },
  exit: { opacity: 0, x: 24, transition: transitions.exit },
};

/** Fade + scale — modals, dialogs, dropdown menus. */
export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: transitions.enter },
  exit: { opacity: 0, scale: 0.96, transition: transitions.exit },
};

/** A translucent backdrop/scrim behind a modal or mobile drawer. */
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.standard },
  exit: { opacity: 0, transition: transitions.exit },
};
