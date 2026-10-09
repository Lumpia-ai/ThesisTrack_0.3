import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PartnerStatusTone } from '@/components/partner/partner-data';

export function PartnerStatCard({
  title,
  value,
  note,
  children
}: {
  title: string;
  value: ReactNode;
  note?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="stat-card">
      <h3>{title}</h3>
      <h2>{value}</h2>
      {note ? <p>{note}</p> : null}
      {children}
    </article>
  );
}

const BADGE_BASE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.75rem',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 700,
  lineHeight: 1.4,
  whiteSpace: 'nowrap'
};

export function PartnerDepartmentBadge({
  children,
  style
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      className="dept-badge"
      style={{ ...BADGE_BASE_STYLE, background: 'var(--primary-soft)', color: 'var(--primary)', ...style }}
    >
      {children}
    </span>
  );
}

const STATUS_TONE_STYLE: Record<PartnerStatusTone, { background: string; color: string }> = {
  approved: { background: 'var(--success-soft)', color: 'var(--success)' },
  completed: { background: 'var(--success-soft)', color: 'var(--success)' },
  deployed: { background: 'var(--info-soft)', color: 'var(--info)' },
  active: { background: 'var(--info-soft)', color: 'var(--info)' },
  pending: { background: 'var(--warning-soft)', color: 'var(--warning)' },
  warning: { background: 'var(--warning-soft)', color: 'var(--warning)' },
  danger: { background: 'var(--danger-soft)', color: 'var(--danger)' }
};

export function PartnerStatusBadge({
  children,
  tone,
  style
}: {
  children: ReactNode;
  tone: PartnerStatusTone;
  style?: CSSProperties;
}) {
  const toneStyle = STATUS_TONE_STYLE[tone] ?? STATUS_TONE_STYLE.active;

  return (
    <span className={`status-badge status-${tone}`} style={{ ...BADGE_BASE_STYLE, ...toneStyle, ...style }}>
      {children}
    </span>
  );
}

export function PartnerButton({
  children,
  variant = 'outline',
  small = false,
  type = 'button',
  onClick
}: {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'danger';
  small?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}) {
  const variantClass =
    variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-outline';

  return (
    <button className={`btn ${variantClass}${small ? ' small' : ''}`} type={type} onClick={onClick}>
      {children}
    </button>
  );
}

export function PartnerModal({
  open,
  title,
  narrow = false,
  onClose,
  children,
  footer
}: {
  open: boolean;
  title: string;
  narrow?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          background: 'var(--surface)',
          borderRadius: '1.2rem',
          boxShadow: 'var(--shadow-lg, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
          width: '100%',
          maxWidth: narrow ? '480px' : '640px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-sunken)' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)', fontWeight: 800 }}>{title}</h3>
          <button 
            aria-label="Close modal" 
            type="button" 
            onClick={onClose}
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', transition: 'background 0.2s', fontSize: '1.2rem' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-accent)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <i aria-hidden="true" className="fas fa-times" />
          </button>
        </div>
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', maxHeight: '70vh' }}>
          {children}
        </div>
        {footer ? (
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-sunken)', display: 'flex', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
