import Link from 'next/link';

import { BrandName } from '@/components/branding/brand-copy';

import styles from '@/app/page.module.css';

const socialLinks = [
  { href: '#', label: 'Facebook', icon: 'fab fa-facebook-f' },
  { href: '#', label: 'Twitter', icon: 'fab fa-twitter' },
  { href: '#', label: 'Email', icon: 'fas fa-envelope' },
  { href: '#', label: 'GitHub', icon: 'fab fa-github' }
];

export function LandingFooter() {
  return (
    <footer className={`${styles.footer} relative border-t-4 border-amber-500`}>
      <div className={`${styles.container} ${styles.footerGrid} relative z-10`}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>
            <h2 className={styles.footerTitle}>
              <BrandName accentClassName="text-amber-500" />
            </h2>
          </div>
          <p>
            Institutional thesis and capstone project management for registration,
            progress monitoring, repository archiving, and research outcomes.
          </p>
        </div>

        <div className={styles.footerColumn}>
          <h3>Stay Connected</h3>
          <div className={styles.footerSocials}>
            {socialLinks.map(link => (
              <Link key={link.label} href={link.href} aria-label={link.label}>
                <i className={link.icon} />
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; 2026 <BrandName />. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
