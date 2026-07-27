import { motion } from 'framer-motion';

import { transitions } from '../../theme/motion';

import styles from './DonutChart.module.css';

export interface DonutChartSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * Hand-rolled SVG donut — a ring built from one `stroke-dasharray` arc
 * per segment (the standard technique), plus a label/percent/count
 * legend. Zero-value segments are dropped before rendering (an honest
 * "nothing here" reads better than a legend row claiming 0%).
 */
export function DonutChart({
  segments,
  size = 180,
  thickness = 26,
}: {
  segments: DonutChartSegment[];
  size?: number;
  thickness?: number;
}): JSX.Element {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.svgWrap}>
        <motion.svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Application status distribution"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: transitions.enter.ease }}
        >
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={thickness}
            />
            {total > 0 &&
              visible.map((segment) => {
                const length = (segment.value / total) * circumference;
                const offset = -((cumulative / total) * circumference);
                cumulative += segment.value;
                return (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
          </g>
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.14}
            fontWeight={800}
            fill="var(--color-text-primary)"
          >
            {total}
          </text>
        </motion.svg>
      </div>

      <div className={styles.legend}>
        {visible.map((segment) => (
          <div key={segment.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: segment.color }} />
            <span className={styles.legendLabel}>{segment.label}</span>
            <span className={styles.legendValue}>
              {total > 0 ? Math.round((segment.value / total) * 100) : 0}% ({segment.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
