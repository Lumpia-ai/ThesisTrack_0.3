'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { BrandName } from '@/components/branding/brand-copy';
import { LogoIcon } from '@/components/branding/logo-icon';
import { AuthModal, type AuthView, shouldOpenAuthModal } from '@/components/auth/auth-modal';
import { useBranding } from '@/components/branding/branding-provider';
import styles from '@/app/page.module.css';

export function LandingNavigation() {
  const { branding } = useBranding();
  const [isOpen, setIsOpen] = useState(false);
  const [activeHref, setActiveHref] = useState('/#home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [authView, setAuthView] = useState<AuthView | null>(null);
  const pathname = usePathname();
  const navigation = branding.navigation;
  const visibleLinks = useMemo(
    () => navigation.links.map(link => link.id === 'about' ? { ...link, href: '/#about' } : link).filter((link) => link.visible),
    [navigation.links]
  );

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 8);

    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });

    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  useEffect(() => {
    if (pathname !== '/') {
      setActiveHref(pathname);
      return;
    }

    const sectionLinks = visibleLinks
      .map((link) => {
        const hashIndex = link.href.indexOf('#');
        const id = hashIndex >= 0 ? link.href.slice(hashIndex + 1) : '';
        const section = id ? document.getElementById(id) : null;

        return section ? { href: link.href, section } : null;
      })
      .filter((item): item is { href: string; section: HTMLElement } => Boolean(item));

    if (!sectionLinks.length) {
      setActiveHref('/#home');
      return;
    }

    let frame = 0;

    const updateActiveHref = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        // Only highlight a link while the activation line is inside its own section, so
        // unlinked sections (e.g. Hall of Excellence) leave every link unhighlighted.
        const activationLine = 140;
        const activeSection = sectionLinks.find((item) => {
          const rect = item.section.getBoundingClientRect();
          return rect.top <= activationLine && rect.bottom > activationLine;
        });

        setActiveHref(activeSection ? activeSection.href : '');
      });
    };

    updateActiveHref();
    window.addEventListener('scroll', updateActiveHref, { passive: true });
    window.addEventListener('resize', updateActiveHref);
    window.addEventListener('hashchange', updateActiveHref);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', updateActiveHref);
      window.removeEventListener('resize', updateActiveHref);
      window.removeEventListener('hashchange', updateActiveHref);
    };
  }, [pathname, visibleLinks]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isLinkActive = (href: string) => {
    const isAboutLink = href === '/about' && pathname === '/about';
    const isSectionLink = pathname === '/' && href === activeHref;

    return isAboutLink || isSectionLink;
  };

  const getActiveClassName = (href: string) => (
    `${styles.navLink} ${isLinkActive(href) ? styles.navLinkActive : ''}`
  );

  return (
    <nav
      className={`${styles.navbar} ${styles.navbarFloating} ${isScrolled ? styles.navbarScrolled : ''}`}
      aria-label="Primary navigation"
    >
      <div className={`${styles.container} ${styles.navbarInner}`}>
        <Link href="/#home" className={styles.brand} aria-label="Go to ThesisTrack home">
          <div className={styles.brandLockup}>
            <LogoIcon className={styles.brandLogo} />
            <div>
              <h2>
                <BrandName />
              </h2>
              <p>{navigation.subtitle}</p>
            </div>
          </div>
        </Link>

        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-controls="landing-navigation"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(current => !current)}
        >
          <span className={styles.mobileMenuIcon} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <div
          id="landing-navigation"
          className={`${styles.navLinks} ${isOpen ? styles.navLinksOpen : ''}`}
        >
          <div className={styles.navLinkList}>
            {visibleLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={getActiveClassName(link.href)}
                aria-current={isLinkActive(link.href) ? 'page' : undefined}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className={styles.navActions}>
            {navigation.showRegister ? (
              <Link
                href="/register"
                className={`${styles.navAuthButton} ${styles.navAuthOutline}`}
                onClick={(event) => {
                  // Plain click opens the register view; new-tab/middle clicks still reach the full /register page.
                  if (shouldOpenAuthModal(event)) {
                    event.preventDefault();
                    setIsOpen(false);
                    setAuthView('register');
                  }
                }}
              >
                {navigation.registerLabel}
              </Link>
            ) : null}

            {navigation.showLogin ? (
              <Link
                href="/login"
                className={`${styles.navAuthButton} ${styles.navAuthPrimary}`}
                onClick={(event) => {
                  // Plain click opens the modal; new-tab/middle clicks still reach the full /login page.
                  if (shouldOpenAuthModal(event)) {
                    event.preventDefault();
                    setIsOpen(false);
                    setAuthView('login');
                  }
                }}
              >
                {navigation.loginLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <AuthModal view={authView} onViewChange={setAuthView} onClose={() => setAuthView(null)} />
    </nav>
  );
}
