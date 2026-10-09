import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TechTransferStatusTone } from '@/components/tech-transfer/tech-transfer-data';

export function TechTransferStatCard({
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

export function TechTransferDepartmentBadge({ children }: { children: ReactNode }) {
  return <span className="dept-badge">{children}</span>;
}

export function TechTransferStatusBadge({
  children,
  tone
}: {
  children: ReactNode;
  tone: TechTransferStatusTone;
}) {
  const statusClass =
    tone === 'approved'
      ? 'status-approved'
      : tone === 'pending'
        ? 'status-pending'
        : tone === 'warning'
          ? 'status-warning'
          : tone === 'danger'
            ? 'status-danger'
            : tone === 'completed'
              ? 'status-completed'
              : tone === 'deployed'
                ? 'status-deployed'
                : tone === 'processing'
                  ? 'status-info'
                  : 'status-active';

  return <span className={`status-badge ${statusClass}`}>{children}</span>;
}

export function TechTransferButton({
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

export function TechTransferModal({
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
      className={`modal${open ? ' show' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`modal-content${narrow ? ' is-narrow' : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button aria-label="Close modal" className="btn btn-outline small" type="button" onClick={onClose}>
            <i aria-hidden="true" className="fas fa-times" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
