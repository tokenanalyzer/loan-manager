import { motion } from 'framer-motion';

import { slideUpVariants } from '../../theme/motion';

import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Skeleton } from './Skeleton';
import styles from './StatCard.module.css';

export type StatCardTint = 'indigo' | 'electric' | 'amber' | 'green';

const TINT_CLASS: Record<StatCardTint, string> = {
  indigo: 'tintIndigo',
  electric: 'tintElectric',
  amber: 'tintAmber',
  green: 'tintGreen',
};

/**
 * KPI card — icon badge, value, label, and either a real trend (only
 * ever passed when genuinely derivable from timestamped backend data —
 * see `dashboard-data.ts`) or a neutral `footerNote` for metrics with
 * no historical basis for a percentage. Never fabricate `trend`.
 * Pass `loading` while the source data hasn't resolved yet — renders
 * skeleton blocks in place of the value/trend rather than a stale "0".
 * Pass `onClick` to navigate to the metric's filtered/detail screen —
 * "no decorative UI, every KPI card is clickable" is a standing
 * requirement, not a one-off; every dashboard StatCard should carry one
 * once its destination screen exists.
 */
export function StatCard({
  label,
  value,
  icon,
  tint,
  trend,
  footerNote,
  loading = false,
  onClick,
}: {
  label: string;
  value: string;
  icon: IconName;
  tint: StatCardTint;
  trend?: { direction: 'up' | 'down'; percent: number };
  footerNote?: string;
  loading?: boolean;
  onClick?: () => void;
}): JSX.Element {
  return (
    <motion.div variants={slideUpVariants} initial="initial" animate="animate">
      <Card
        className={onClick ? styles.clickable : undefined}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        <div className={styles.top}>
          <span className={styles.label}>{label}</span>
          <span className={`${styles.iconBadge} ${styles[TINT_CLASS[tint]]}`}>
            <Icon name={icon} size={20} />
          </span>
        </div>
        {loading ? (
          <Skeleton variant="rect" width="60%" height={32} />
        ) : (
          <span className={styles.value}>{value}</span>
        )}
        <div className={styles.footer}>
          {loading ? (
            <Skeleton variant="text" width="40%" />
          ) : (
            <>
              {trend && (
                <span className={trend.direction === 'up' ? styles.trendUp : styles.trendDown}>
                  <Icon name={trend.direction === 'up' ? 'trendUp' : 'trendDown'} size={14} />
                  {trend.percent.toFixed(1)}%
                </span>
              )}
              {footerNote && <span className={styles.footerNote}>{footerNote}</span>}
              {trend && <span className={styles.footerNote}>vs last month</span>}
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
