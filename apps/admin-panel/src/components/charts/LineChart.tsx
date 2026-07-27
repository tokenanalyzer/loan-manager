import { motion } from 'framer-motion';

import { transitions } from '../../theme/motion';

import { niceMax, smoothPath } from './chart-math';
import styles from './LineChart.module.css';

export interface LineChartSeries {
  label: string;
  color: string;
  /** Same length/order across every series in one chart — points are plotted by index, not matched by `x`. */
  points: { x: string; y: number }[];
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 300;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };
const TICK_COUNT = 5;

/**
 * Hand-rolled SVG line chart — multi-series, lightly smoothed
 * (Catmull-Rom→Bezier, see `chart-math.ts`), gridlines, dot markers,
 * legend, and a one-time animated stroke reveal on mount. No charting
 * library, per the confirmed decision (matches `Icon.tsx`'s existing
 * no-dependency precedent). `points.length === 0` renders nothing but
 * axes — callers should gate on that for an empty state instead.
 */
export function LineChart({ series, height = CHART_HEIGHT }: { series: LineChartSeries[]; height?: number }): JSX.Element {
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const pointCount = series[0]?.points.length ?? 0;
  const maxValue = niceMax(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y))));

  const xFor = (index: number): number =>
    pointCount <= 1 ? PADDING.left : PADDING.left + (index / (pointCount - 1)) * plotWidth;
  const yFor = (value: number): number => PADDING.top + plotHeight - (value / maxValue) * plotHeight;

  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (maxValue / TICK_COUNT) * i);

  return (
    <div className={styles.wrapper}>
      <div className={styles.legend}>
        {series.map((s) => (
          <span key={s.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        role="img"
        aria-label={series.map((s) => s.label).join(' vs. ')}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className={styles.gridLine}
              x1={PADDING.left}
              x2={CHART_WIDTH - PADDING.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
            />
            <text className={styles.axisLabel} x={PADDING.left - 8} y={yFor(tick) + 4} textAnchor="end">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {series[0]?.points.map((point, index) => (
          <text
            key={point.x}
            className={styles.axisLabel}
            x={xFor(index)}
            y={height - 6}
            textAnchor="middle"
          >
            {point.x}
          </text>
        ))}

        {series.map((s) => {
          const coords = s.points.map((p, i) => ({ x: xFor(i), y: yFor(p.y) }));
          return (
            <g key={s.label}>
              <motion.path
                d={smoothPath(coords)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: transitions.enter.ease }}
              />
              {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={3.5} fill={s.color} stroke="var(--color-surface)" strokeWidth={1.5} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
