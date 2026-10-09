import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProgramHeadStatusTone } from '@/components/program-head/program-head-data';

type ProgramHeadCardSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

type ProgramHeadStatCardProps = {
  title: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: string;
  children?: ReactNode;
  className?: string;
};

type ProgramHeadModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
};

export function ProgramHeadCardSection({
  title,
  description,
  action,
  children,
  className
}: ProgramHeadCardSectionProps) {
  return (
    <section className={`ph-card-section${className ? ` ${className}` : ''}`}>
      <div className="ph-card-header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="ph-card-body">{children}</div>
    </section>
  );
}

/** Shared surface for compact program-head cards, tiles and tables. */
export const PH_CARD_CLASS =
  'bg-[var(--surface)] ring-1 ring-[var(--border)] rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden min-w-0';

export const PH_TH_CLASS = 'px-5 py-3 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--muted)] whitespace-nowrap';
export const PH_TD_CLASS = 'px-5 py-3 align-middle';

export const getProgramHeadInitials = (name: string) => name.split(' ').map((part) => part[0]).join('');

export function ProgramHeadStatCard({
  title,
  value,
  note,
  icon,
  iconTone = 'bg-[#0F3DDE]/10 text-[#0F3DDE]',
  children,
  className
}: ProgramHeadStatCardProps & { iconTone?: string }) {
  return (
    <article className={`${PH_CARD_CLASS} p-4 ${className || ''}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">{title}</h3>
        {icon && (
          <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs ${iconTone}`}>
            <i className={icon}></i>
          </span>
        )}
      </div>

      <div className="text-3xl font-extrabold text-[var(--text)] tracking-tight tabular-nums leading-none">{value}</div>

      {children && <div className="mt-3">{children}</div>}

      {note && <p className="mt-2 text-xs font-medium text-[var(--muted)]">{note}</p>}
    </article>
  );
}

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Counts up from the last shown value to `value` (instant with reduced motion). */
export function ProgramHeadAnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const from = displayRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{display}</>;
}

/** Thin progress bar used inside stat cards, tables and lists. */
export function ProgramHeadMeter({ pct, tone = 'bg-[#0F3DDE]', className = '' }: { pct: number; tone?: string; className?: string }) {
  return (
    <div className={`h-1.5 w-full bg-[var(--surface-alt)] rounded-full overflow-hidden ring-1 ring-inset ring-[var(--border)] ${className}`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}></div>
    </div>
  );
}

/**
 * One-line page toolbar. The page title already lives in the shell's top bar,
 * so this only carries context and the page-level actions.
 */
export function ProgramHeadPageHeader({ description, meta, actions }: { description: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest mb-0.5">
          {meta ?? 'IT Department · AY 2025-2026'}
        </p>
        <p className="text-sm text-[var(--muted)] font-medium">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

export function ProgramHeadPrimaryAction({ icon, children, onClick }: { icon: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 px-4 bg-[#0F3DDE] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-900/15 hover:bg-[#0c31b3] transition-colors flex items-center gap-2 whitespace-nowrap"
    >
      <i className={`fas ${icon} text-xs`}></i> {children}
    </button>
  );
}

/** Compact card with a fixed-height title row. */
export function ProgramHeadPanel({
  title,
  action,
  children,
  className = '',
  bodyClassName = 'p-5'
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`${PH_CARD_CLASS} ${className}`}>
      <div className="px-5 min-h-14 py-2 shrink-0 border-b border-[var(--border)] flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-[15px] font-bold text-[var(--text)] min-w-0">{title}</h3>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function ProgramHeadFilterSelect({
  value,
  onChange,
  options,
  label
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string | { value: string; label: string }>;
  label: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 pl-3 pr-8 rounded-lg bg-[var(--surface-alt)] ring-1 ring-[var(--border)] text-sm font-semibold text-[var(--text)] focus:ring-2 focus:ring-[#0F3DDE] outline-none cursor-pointer appearance-none"
      >
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
      <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--muted)] pointer-events-none"></i>
    </div>
  );
}

export function ProgramHeadSearchInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-64 group">
      <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs group-focus-within:text-[#0F3DDE] transition-colors"></i>
      <input
        aria-label={placeholder}
        className="w-full h-9 pl-8 pr-3 rounded-lg bg-[var(--surface-alt)] ring-1 ring-[var(--border)] text-sm text-[var(--text)] focus:ring-2 focus:ring-[#0F3DDE] focus:bg-[var(--surface)] outline-none placeholder:text-[var(--muted)] transition-all"
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Segmented tab row used as a single-choice filter. */
export function ProgramHeadTabs<T extends string>({
  tabs,
  value,
  onChange,
  counts
}: {
  tabs: readonly T[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            value === tab ? 'bg-[#0F3DDE] text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
          }`}
        >
          {tab}
          {counts?.[tab] !== undefined && (
            <span className={`tabular-nums ${value === tab ? 'text-white/80' : 'opacity-70'}`}>{counts[tab]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Label/value grid used inside detail drawers. */
/*
 * Plain status palette (navy, light blue, gold, neutral) shared with the dashboard.
 * Values come from `.ph-palette` / `.ph-dashboard-page` tokens (derived from system
 * branding); the fallbacks keep them working in drawers/modals portalled to <body>.
 */
export const PH_PALETTE = {
  navy: 'var(--ph-c-navy, var(--color-primary, #003A8F))',
  light: 'var(--ph-c-light, #58A2F5)',
  gold: 'var(--ph-c-gold, var(--color-accent, #F6BE00))',
  neutral: 'var(--ph-c-neutral, #CBD5E1)',
  brandText: 'var(--ph-brand-text, var(--color-primary, #003A8F))'
} as const;

/** Translucent tint of a palette colour. */
export const phTint = (color: string, pct = 12) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Status pill: soft tint background, coloured dot (or icon), darkened text for contrast. */
export function ProgramHeadPill({ color, icon, children }: { color: string; icon?: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ backgroundColor: phTint(color, 14), color: `color-mix(in srgb, ${color} 70%, var(--text, #111827))` }}
    >
      {icon ? <i className={`fas ${icon} text-[10px]`} style={{ color }}></i> : <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>}
      {children}
    </span>
  );
}

/**
 * KPI card in the shared palette: tinted icon, count-up value, optional filling bar.
 * `value` is animated when it's a number; pass a string for preformatted values.
 */
export function ProgramHeadKpiCard({
  title,
  value,
  suffix,
  note,
  icon,
  color = PH_PALETTE.navy,
  pct
}: {
  title: string;
  value: number | string;
  suffix?: string;
  note?: ReactNode;
  icon: string;
  color?: string;
  pct?: number;
}) {
  return (
    <div className={`${PH_CARD_CLASS} p-4 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-shadow duration-200`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">{title}</h3>
        <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: phTint(color, 14), color }}>
          <i className={`fas ${icon}`}></i>
        </span>
      </div>
      {/* Numbers use the large KPI size; text values (e.g. a name) are smaller and truncate. */}
      <div
        className={`font-extrabold text-[var(--text)] tracking-tight tabular-nums leading-none ${typeof value === 'number' ? 'text-3xl' : 'text-xl truncate py-1'}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {typeof value === 'number' ? <ProgramHeadAnimatedNumber value={value} /> : value}
        {suffix && <span className="text-lg text-[var(--muted)] ml-0.5">{suffix}</span>}
      </div>
      {typeof pct === 'number' && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] overflow-hidden ph-anim-meter">
          <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }}></div>
        </div>
      )}
      {note && <p className="mt-2 text-xs font-medium text-[var(--muted)]">{note}</p>}
    </div>
  );
}

/** Adviser/person initials avatar in the brand tint. */
export function ProgramHeadAvatar({ name }: { name: string }) {
  return (
    <span
      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
      style={{ backgroundColor: phTint(PH_PALETTE.navy, 10), color: PH_PALETTE.brandText }}
    >
      {getProgramHeadInitials(name.replace(/^(Dr|Prof|Engr)\.\s*/, ''))}
    </span>
  );
}

/* ── Pagination ─────────────────────────────────────────────────────────── */

export const PH_PAGE_SIZE = 6;
/** Fixed row height (a <tr> height acts as a minimum) so real and filler rows match. */
export const PH_ROW_HEIGHT_CLASS = 'h-[72px]';
const PAGE_EXIT_MS = 160;
const PAGE_SLIDE_PX = 16;

/**
 * Client-side pagination with a smooth, direction-aware page switch:
 * `page` updates at once (so the button highlights immediately) while the rows
 * fade/slide out; after PAGE_EXIT_MS the rows swap and the new ones slide in.
 * Returns props for the <tbody> plus the number of filler rows needed to keep
 * every page the same height. Resets to page 1 whenever `resetKey` changes.
 */
export function useProgramHeadPagination<T>(items: readonly T[], resetKey: string, pageSize = PH_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [displayPage, setDisplayPage] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isLeaving, setIsLeaving] = useState(false);
  const timer = useRef<number | null>(null);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const shownPage = Math.min(displayPage, pageCount);
  const pageStart = (shownPage - 1) * pageSize;
  const pageItems = items.slice(pageStart, pageStart + pageSize);

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const goToPage = (next: number) => {
    if (next === currentPage || next < 1 || next > pageCount) return;
    clearTimer();
    setPage(next);
    setDirection(next > currentPage ? 1 : -1);

    if (prefersReducedMotion()) {
      setDisplayPage(next);
      return;
    }

    setIsLeaving(true);
    timer.current = window.setTimeout(() => {
      setDisplayPage(next);
      setIsLeaving(false);
      timer.current = null;
    }, PAGE_EXIT_MS);
  };

  useEffect(() => {
    clearTimer();
    setPage(1);
    setDisplayPage(1);
    setIsLeaving(false);
  }, [resetKey]);

  useEffect(() => clearTimer, []);

  const bodyKey = `${shownPage}-${items.length}-${resetKey}`;
  const bodyProps = {
    // While leaving, the entrance class must be off: a filled animation would override the inline fade-out.
    className: isLeaving ? '' : 'ph-anim-slide-in',
    style: {
      ['--ph-slide-from' as string]: `${direction * PAGE_SLIDE_PX}px`,
      transition: `opacity ${PAGE_EXIT_MS}ms ease-in, translate ${PAGE_EXIT_MS}ms ease-in`,
      ...(isLeaving ? { opacity: 0, translate: `${-direction * PAGE_SLIDE_PX}px 0` } : {})
    } as CSSProperties
  };

  return {
    pageItems,
    currentPage,
    pageCount,
    pageStart,
    total: items.length,
    goToPage,
    bodyKey,
    bodyProps,
    fillerCount: pageCount > 1 ? pageSize - pageItems.length : 0
  };
}

export function ProgramHeadPaginationBar({
  currentPage,
  pageCount,
  pageStart,
  shownCount,
  total,
  onPage,
  noun = 'projects'
}: {
  currentPage: number;
  pageCount: number;
  pageStart: number;
  shownCount: number;
  total: number;
  onPage: (page: number) => void;
  noun?: string;
}) {
  if (total === 0) return null;
  const arrowClass = 'w-8 h-8 rounded-lg flex items-center justify-center text-xs text-[var(--muted)] ring-1 ring-inset ring-[var(--border)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] disabled:opacity-40 disabled:pointer-events-none transition-colors';
  return (
    <div className="px-5 py-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[var(--muted)]">
        Showing <strong className="text-[var(--text)] tabular-nums">{pageStart + 1}–{pageStart + shownCount}</strong> of{' '}
        <strong className="text-[var(--text)] tabular-nums">{total}</strong> {noun}
      </p>
      {pageCount > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pages">
          <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPage(currentPage - 1)} className={arrowClass}>
            <i className="fas fa-chevron-left"></i>
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => {
            const active = number === currentPage;
            return (
              <button
                key={number}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onPage(number)}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                  active ? 'text-white shadow-sm' : 'text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
                }`}
                style={active ? { backgroundColor: PH_PALETTE.navy } : undefined}
              >
                {number}
              </button>
            );
          })}
          <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => onPage(currentPage + 1)} className={arrowClass}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </nav>
      )}
    </div>
  );
}

/** Empty rows that pad a short last page so the table height never changes. */
export function ProgramHeadFillerRows({ count, colSpan }: { count: number; colSpan: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <tr key={`filler-${index}`} aria-hidden="true" className={PH_ROW_HEIGHT_CLASS}>
          <td colSpan={colSpan}></td>
        </tr>
      ))}
    </>
  );
}

export function ProgramHeadDetailGrid({ items }: { items: ReadonlyArray<readonly [string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-2 gap-px bg-[var(--border)] rounded-xl overflow-hidden ring-1 ring-[var(--border)]">
      {items.map(([label, value]) => (
        <div key={label} className="bg-[var(--surface)] px-4 py-3">
          <dt className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">{label}</dt>
          <dd className="text-sm font-bold text-[var(--text)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgramHeadDepartmentBadge({ children }: { children: ReactNode }) {
  return <span className="ph-dept-badge">{children}</span>;
}

export function ProgramHeadStatusBadge({
  children,
  tone = 'approved'
}: {
  children: ReactNode;
  tone?: ProgramHeadStatusTone;
}) {
  return <span className={`ph-status-badge is-${tone}`}>{children}</span>;
}

export function ProgramHeadButton({
  children,
  type = 'button',
  variant = 'outline',
  className,
  onClick,
  disabled
}: {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'outline' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`ph-btn is-${variant}${className ? ` ${className}` : ''}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function ProgramHeadModal({
  open,
  title,
  onClose,
  children,
  maxWidth = 720
}: ProgramHeadModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="ph-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="ph-modal-card" style={{ maxWidth }}>
        <div className="ph-modal-head">
          <h3>{title}</h3>
          <button aria-label="Close modal" className="ph-icon-btn" type="button" onClick={onClose}>
            <i aria-hidden="true" className="fas fa-times" />
          </button>
        </div>
        <div className="ph-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ProgramHeadDrawer({
  open,
  title,
  onClose,
  children,
  maxWidth = 600
}: ProgramHeadModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0B1120]/40 dark:bg-black/60 backdrop-blur-sm transition-all duration-300 ease-out"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_20px_60px_rgba(0,0,0,0.2)] ring-1 ring-[var(--border)]"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-alt)] px-8 py-6">
          <h3 className="m-0 text-xl font-bold text-[var(--text)]">{title}</h3>
          <button aria-label="Close panel" className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] shadow-sm ring-1 ring-[var(--border)] transition-all hover:bg-red-50 hover:text-red-500 hover:ring-red-200 dark:hover:bg-red-500/20 dark:hover:ring-red-500/30" type="button" onClick={onClose}>
            <i aria-hidden="true" className="fas fa-times" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
