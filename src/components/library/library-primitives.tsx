import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type LibraryCardSectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

type LibraryStatCardProps = {
  title: string;
  value: ReactNode;
  children?: ReactNode;
  className?: string;
};

type LibraryBadgeProps = {
  children: ReactNode;
  tone?: 'default' | 'approved' | 'warning';
};

type LibraryModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  footer?: ReactNode;
};

export function LibraryCardSection({
  title,
  action,
  children,
  className
}: LibraryCardSectionProps) {
  return (
    <section className={`library-section-card${className ? ` ${className}` : ''}`}>
      <div className="library-section-head">
        <h3>{title}</h3>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="library-section-body">{children}</div>
    </section>
  );
}

export function LibraryStatCard({
  title,
  value,
  children,
  className
}: LibraryStatCardProps) {
  return (
    <article className={`library-stat-card${className ? ` ${className}` : ''}`}>
      <h3>{title}</h3>
      <h2>{value}</h2>
      {children}
    </article>
  );
}

export function LibraryDepartmentBadge({ children }: { children: ReactNode }) {
  return <span className="library-dept-badge">{children}</span>;
}

export function LibraryStatusBadge({
  children,
  tone = 'approved'
}: LibraryBadgeProps) {
  return <span className={`library-status-badge is-${tone}`}>{children}</span>;
}

export function LibraryTag({ children }: { children: ReactNode }) {
  return <span className="library-tag">{children}</span>;
}

export function LibraryModal({
  open,
  title,
  onClose,
  children,
  maxWidth = 720,
  footer
}: LibraryModalProps) {
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
        padding: '2rem 1rem'
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{ 
          maxWidth, 
          width: '100%',
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: '85vh', 
          overflow: 'hidden',
          background: 'white',
          borderRadius: '1.2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0F172A', fontWeight: 800 }}>{title}</h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', transition: 'background 0.2s', fontSize: '1.2rem' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
