'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type RbacDialogProps = {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  /** While true, Escape and the backdrop don't close the dialog (a request is in flight). */
  busy?: boolean;
  maxWidth?: number;
  children: ReactNode;
  footer?: ReactNode;
  /** Changing this moves focus back to the [data-autofocus] element (for dialogs with steps). */
  focusKey?: string;
};

/**
 * Dialog used by the account review screens in both the System Admin and Program Head portals. Styled with
 * the shared portal variables (--surface, --text, --border...) so it follows each portal's theme.
 */
export function RbacDialog({ open, title, subtitle, onClose, busy = false, maxWidth = 640, children, footer, focusKey }: RbacDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  busyRef.current = busy;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const first = dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? dialog;
      first?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;

      if (event.key === 'Escape') {
        event.preventDefault();

        if (!busyRef.current) {
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab' || !dialog) {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0
      );

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open || focusKey === undefined) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      (dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? dialog)?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, focusKey]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--surface,#fff)] text-[var(--text,#0f172a)] shadow-[0_24px_70px_rgba(15,23,42,0.3)] outline-none ring-1 ring-[var(--border,#e2e8f0)] sm:rounded-2xl"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border,#e2e8f0)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 className="m-0 text-lg font-bold leading-tight text-[var(--text,#0f172a)]" id={titleId}>
              {title}
            </h3>
            {subtitle ? <div className="mt-1 text-sm text-[var(--muted,#64748b)]">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted,#64748b)] transition hover:bg-[var(--surface-alt,#f1f5f9)] hover:text-[var(--text,#0f172a)] disabled:opacity-50"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <i className="fas fa-xmark text-lg" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border,#e2e8f0)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/** Inline message used inside the review dialogs and pages. */
export function RbacNotice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: ReactNode }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'error'
        ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
        : 'border-[var(--border,#e2e8f0)] bg-[var(--surface-alt,#f8fafc)] text-[var(--text,#0f172a)]';
  const icon = tone === 'success' ? 'fa-circle-check' : tone === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm leading-5 ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>
      <i className={`fas ${icon} mt-0.5`} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
