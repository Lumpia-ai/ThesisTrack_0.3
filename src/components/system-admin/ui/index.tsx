import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './system-admin-ui.module.css';

/*
 * Shared building blocks for System Admin pages, themed like the public landing page.
 * Colors come from the Theme & Branding variables (and switch for the dark portal theme);
 * see system-admin-ui.module.css.
 */

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export type CardAccent = 'primary' | 'accent';
export type IconTone = 'primary' | 'accent' | 'error' | 'success';

const CARD_ACCENT_CLASS: Record<CardAccent, string> = {
  primary: styles.cardPrimary,
  accent: styles.cardAccent
};

const TILE_TONE_CLASS: Record<IconTone, string> = {
  primary: styles.tilePrimary,
  accent: styles.tileAccent,
  error: styles.tileError,
  success: styles.tileSuccess
};

/**
 * Page wrapper: sets the admin theme tokens (light + dark) and the tinted page background.
 * `wide` lifts the shell's 1600px content cap so the page fills the space a collapsed sidebar frees up.
 */
export function AdminPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={cx(styles.adminPage, wide && styles.adminPageWide)}>{children}</div>;
}

export function PageHeader({
  kicker,
  title,
  titleAccent,
  description,
  actions
}: {
  /** Small pill badge above the title (landing-page "section kicker" style). */
  kicker?: string;
  /** Optional: a page can show only the header actions (no heading text). */
  title?: string;
  /** Second half of a two-tone title, shown in the accent color. */
  titleAccent?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      {kicker || title || description ? (
        <div className={styles.pageHeaderText}>
          {kicker ? <span className={styles.kicker}>{kicker}</span> : null}
          {title ? (
            <h1 className={styles.pageTitle}>
              <span className={styles.pageTitleMain}>{title}</span>
              {titleAccent ? (
                <>
                  {' '}
                  <span className={styles.pageTitleAccent}>{titleAccent}</span>
                </>
              ) : null}
            </h1>
          ) : null}
          {description ? <p className={styles.pageDescription}>{description}</p> : null}
        </div>
      ) : null}
      {actions ? <div className={styles.pageHeaderActions}>{actions}</div> : null}
    </header>
  );
}

export function ActionLink({
  href,
  icon,
  variant = 'secondary',
  children
}: {
  href: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(styles.actionLink, variant === 'primary' ? styles.actionPrimary : styles.actionSecondary)}>
      {icon ? <i className={`fas ${icon}`} aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}

export function TextLink({ href, children, label }: { href: string; children: ReactNode; label?: string }) {
  return (
    <Link href={href} className={styles.textLink} aria-label={label}>
      {children}
    </Link>
  );
}

/** Tinted rounded-square icon (decorative). */
export function IconTile({ icon, tone = 'primary' }: { icon: string; tone?: IconTone }) {
  return (
    <span className={cx(styles.iconTile, TILE_TONE_CLASS[tone])} aria-hidden="true">
      <i className={`fas ${icon}`} />
    </span>
  );
}

export function KpiCard({
  label,
  value,
  helper,
  icon,
  iconTone = 'primary',
  accent = 'primary',
  valueTone = 'default',
  helperTone = 'default',
  href,
  children
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: string;
  iconTone?: IconTone;
  accent?: CardAccent;
  valueTone?: 'default' | 'error';
  helperTone?: 'default' | 'success';
  /** Makes the whole card a link (with hover lift). */
  href?: string;
  /** Optional visual (chart, gauge, breakdown) shown beside the number, or below it on narrow cards. */
  children?: ReactNode;
}) {
  const className = cx(styles.card, CARD_ACCENT_CLASS[accent], styles.kpiCard, href && styles.kpiLink);
  const body = (
    <div className={cx(styles.kpiBody, Boolean(children) && styles.kpiBodySplit)}>
      <div className={styles.kpiMain}>
        <div className={styles.kpiHead}>
          {icon ? <IconTile icon={icon} tone={iconTone} /> : null}
          <span className={styles.kpiLabel}>{label}</span>
        </div>
        <strong className={cx(styles.kpiValue, valueTone === 'error' && styles.kpiValueError)}>{value}</strong>
        {helper ? (
          helperTone === 'success' ? (
            <span className={styles.kpiChip}>
              <i className="fas fa-arrow-trend-up" aria-hidden="true" />
              {helper}
            </span>
          ) : (
            <span className={styles.kpiHelper}>{helper}</span>
          )
        ) : null}
      </div>
      {children ? <div className={styles.kpiExtra}>{children}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
  );
}

export function SectionCard({
  title,
  action,
  children,
  titleId,
  accent = 'primary'
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  titleId?: string;
  accent?: CardAccent;
}) {
  return (
    <section className={cx(styles.card, CARD_ACCENT_CLASS[accent], styles.sectionCard)} aria-labelledby={titleId}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle} id={titleId}>
          {title}
        </h2>
        {action}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon = 'fa-inbox', message }: { icon?: string; message: string }) {
  return (
    <div className={styles.emptyState} role="status">
      <span className={styles.emptyStateIcon}>
        <i className={`fas ${icon}`} aria-hidden="true" />
      </span>
      {message}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: 'success' | 'error' | 'neutral'; children: ReactNode }) {
  const toneClass = tone === 'success' ? styles.statusPillSuccess : tone === 'error' ? styles.statusPillError : styles.statusPillNeutral;

  return <span className={cx(styles.statusPill, toneClass)}>{children}</span>;
}
