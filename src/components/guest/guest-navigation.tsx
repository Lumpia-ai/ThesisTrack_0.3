import Link from 'next/link';

import { BrandName } from '@/components/branding/brand-copy';
import { LogoIcon } from '@/components/branding/logo-icon';
import styles from '@/app/page.module.css';

export function GuestNavigation() {
  return (
    <nav className={styles.navbar} aria-label="Guest repository navigation">
      <div className={`${styles.container} ${styles.navbarInner}`}>
        <Link href="/" className={styles.brand} aria-label="Go to ThesisTrack home">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <LogoIcon style={{ height: '44px', width: 'auto' }} />
            <div>
              <h2>
                <BrandName />
              </h2>
              <p>Higher Education Institutions</p>
            </div>
          </div>
        </Link>

        <div className={styles.navActions}>
          <Link href="/" className={`${styles.navLink}`}>
            <i className="fas fa-house" style={{ marginRight: '0.5rem' }} aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </div>
    </nav>
  );
}
