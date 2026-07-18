/**
 * Minimal hand-rolled icon set — deliberately not an icon library
 * dependency (`Do not introduce unnecessary dependencies`). Covers
 * exactly what the portal shell needs; add new names here rather than
 * reaching for a package.
 */
const PATHS = {
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M18 6L6 18',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  logout: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  home: 'M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9',
  lock: 'M6 11V7a6 6 0 0 1 12 0v4M5 11h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9Z',
  clock: 'M12 7v5l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  alertTriangle:
    'M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z',
  inbox:
    'M3 12h5l1.5 3h5L16 12h5M5 4h14l2 8v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7l2-8Z',
  refresh:
    'M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0 0 14.9 2.5M19.5 9A8 8 0 0 0 4.6 6.5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
