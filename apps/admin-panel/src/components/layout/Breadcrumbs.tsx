import { Link, useLocation } from 'react-router-dom';

import { NAV_ITEMS } from '../../app/navigation.config';
import { Icon } from '../ui/Icon';

import styles from './Breadcrumbs.module.css';

function labelFor(segment: string): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

/** Derives its trail from the current URL + `navigation.config.ts`'s path→label map. */
export function Breadcrumbs(): JSX.Element {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const navItem = NAV_ITEMS.find((item) => item.path === path);
    return { path, label: navItem?.label ?? labelFor(segment) };
  });

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <Link to="/" className={styles.crumb} aria-label="Dashboard">
        <Icon name="home" size={14} />
      </Link>
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className={styles.segment}>
          <Icon name="chevronRight" size={14} className={styles.separator} />
          {index === crumbs.length - 1 ? (
            <span className={styles.current}>{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className={styles.crumb}>
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
