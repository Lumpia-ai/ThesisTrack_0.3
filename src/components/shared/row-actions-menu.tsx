'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type RowAction = {
  label: string;
  icon: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
};

const MENU_WIDTH = 220;
const GAP = 6;

/**
 * "⋯" row-actions menu. The menu is portalled and fixed-positioned so a scrolling table never clips it, opens
 * upward when there's no room below, and supports the menu-button keyboard pattern (arrows, Home/End, Escape).
 */
export function RowActionsMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'down' | 'up' } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? actions.length * 40 + 16;
    const roomBelow = window.innerHeight - rect.bottom;
    const placement = roomBelow < menuHeight + GAP && rect.top > roomBelow ? 'up' : 'down';
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPosition({ top: placement === 'down' ? rect.bottom + GAP : rect.top - GAP - menuHeight, left, placement });
  }, [actions.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    const focusFirst = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    });
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    const handleViewportChange = () => close(false);

    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(focusFirst);
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, close]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted,#64748b)] transition hover:bg-[var(--surface-alt,#f1f5f9)] hover:text-[var(--text,#0f172a)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary,#003a8f)]/40 ${
          open ? 'bg-[var(--surface-alt,#f1f5f9)] text-[var(--text,#0f172a)]' : ''
        }`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <i className="fas fa-ellipsis" aria-hidden="true" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              className="fixed z-[9998] rounded-2xl bg-[var(--surface,#fff)] p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-[var(--border,#e2e8f0)]"
              style={{ top: position?.top ?? -9999, left: position?.left ?? -9999, width: MENU_WIDTH, visibility: position ? 'visible' : 'hidden' }}
              onKeyDown={handleMenuKeyDown}
            >
              {actions.map((action) => (
                <div key={action.label}>
                  {action.separated ? <div className="mx-2 my-1 h-px bg-[var(--border,#e2e8f0)]" role="separator" /> : null}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold outline-none transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      action.danger
                        ? 'text-red-600 hover:bg-red-500/10 focus-visible:bg-red-500/10'
                        : 'text-[var(--text,#0f172a)] hover:bg-[var(--surface-alt,#f1f5f9)] focus-visible:bg-[var(--surface-alt,#f1f5f9)]'
                    }`}
                    onClick={() => {
                      close();
                      action.onSelect();
                    }}
                  >
                    <i className={`fas ${action.icon} w-4 text-center text-[0.8rem] ${action.danger ? '' : 'text-[var(--muted,#64748b)]'}`} aria-hidden="true" />
                    {action.label}
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
