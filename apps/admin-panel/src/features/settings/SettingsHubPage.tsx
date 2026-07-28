import { Link } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import { Icon, type IconName } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';

import styles from './SettingsHubPage.module.css';

const LINKS: { label: string; description: string; path: string; icon: IconName }[] = [
  { label: 'Profile', description: 'Your own account details.', path: '/settings/profile', icon: 'user' },
  {
    label: 'Team',
    description: 'Employee and admin accounts — add, disable, archive, restore.',
    path: '/settings/team',
    icon: 'people',
  },
  {
    label: 'Approvals',
    description: 'Maker-checker requests awaiting Super Admin decision.',
    path: '/settings/approvals',
    icon: 'shieldCheck',
  },
  {
    label: 'Document Types',
    description: 'The document catalog customers upload against.',
    path: '/settings/document-types',
    icon: 'document',
  },
];

/** Settings hub — replaces the Phase 1 "Coming Soon" placeholder with real links to every settings sub-screen. */
export function SettingsHubPage(): JSX.Element {
  return (
    <PageContainer title="Settings" description="Administration for this organization's Loan Manager instance.">
      <div className={styles.grid}>
        {LINKS.map((link) => (
          <Link key={link.path} to={link.path} className={styles.cardLink}>
            <Card interactive className={styles.card}>
              <Icon name={link.icon} size={24} className={styles.icon} />
              <div>
                <div className={styles.label}>{link.label}</div>
                <div className={styles.description}>{link.description}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
