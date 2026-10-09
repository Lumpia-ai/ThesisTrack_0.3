import type { MouseEvent } from 'react';

/**
 * Open the auth modal only for a plain left click; let modifier/middle clicks
 * (new tab, new window) fall through to the real /login or /register link.
 */
export function shouldOpenAuthModal(event: MouseEvent<HTMLAnchorElement>) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Which auth modal view an admin-configurable link should open, if any: '/login' and
 * '/register' (ignoring any ?query or #hash) open the modal; every other link navigates normally.
 */
export function getAuthViewForHref(href: string): 'login' | 'register' | null {
  const path = href.trim().split(/[?#]/)[0].replace(/\/+$/, '');

  if (path === '/login') {
    return 'login';
  }

  if (path === '/register') {
    return 'register';
  }

  return null;
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const authBookTransitionStorageKey = 'thesisTrackAuthBookDirection';

export const authUi = {
  page:
    'relative min-h-dvh overflow-y-auto bg-slate-50 px-4 py-4 font-sans text-gray-900 sm:px-6 sm:py-5 lg:px-8',
  pageWash:
    'pointer-events-none absolute inset-0 overflow-hidden bg-slate-950/24 backdrop-blur-[5px] before:absolute before:-top-[20%] before:-left-[10%] before:h-[80%] before:w-[70%] before:rounded-[100%] before:bg-[#003A8F]/[0.08] before:blur-[104px] before:animate-[pulse_8s_ease-in-out_infinite] after:absolute after:-bottom-[20%] after:-right-[10%] after:h-[80%] after:w-[70%] after:rounded-[100%] after:bg-[#F6BE00]/[0.06] after:blur-[104px] after:animate-[pulse_10s_ease-in-out_infinite_alternate]',
  pagePattern:
    'pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,rgba(15,23,42,0.25)_1px,transparent_1px)] [background-size:18px_18px] mix-blend-overlay',
  topStripe: 'pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-[#003A8F]',
  backLink:
    'absolute left-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 text-sm font-bold text-[#003A8F] shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white hover:bg-white hover:shadow-[0_20px_40px_rgba(0,58,143,0.08)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20 sm:left-6 sm:top-6',
  shell: 'relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] w-full items-center justify-center py-6 sm:py-10 lg:py-12',
  authFrame:
    'w-full max-w-lg mx-auto overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/40 shadow-[0_30px_90px_rgba(0,58,143,0.1)] ring-1 ring-slate-900/[0.03] backdrop-blur-3xl transition-all duration-300 ease-out hover:shadow-[0_34px_100px_rgba(0,58,143,0.15)]',
  authFrameWide:
    'w-full max-w-3xl mx-auto overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/40 shadow-[0_30px_90px_rgba(0,58,143,0.1)] ring-1 ring-slate-900/[0.03] backdrop-blur-3xl transition-all duration-300 ease-out hover:shadow-[0_34px_100px_rgba(0,58,143,0.15)]',
  showcase:
    'relative hidden min-h-full overflow-hidden bg-gradient-to-br from-[#003A8F] to-[#0A1445] p-8 text-white lg:flex lg:flex-col lg:justify-between lg:gap-8 lg:p-12',
  showcaseOverlay:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(246,190,0,0.15),transparent_50%)]',
  showcaseSheen:
    'pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white/10 via-white/[0.035] to-transparent',
  showcaseBookLines:
    'pointer-events-none absolute bottom-24 left-9 right-9 hidden h-24 border-y border-white/10 opacity-35 lg:block',
  showcaseBookLineInner:
    'absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-white/10',
  showcasePageStack:
    'pointer-events-none absolute -right-12 bottom-36 hidden h-48 w-36 -rotate-6 rounded-[8px] border border-white/10 bg-white/[0.055] shadow-[0_24px_70px_rgba(0,0,0,0.20)] lg:block',
  showcasePageStackInner:
    'absolute inset-4 rounded-[6px] border border-white/10 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:100%_1.1rem]',
  showcaseContent: 'relative z-10 max-w-md',
  showcaseBadge:
    'inline-flex items-center gap-2 rounded-full bg-white/[0.095] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#F6BE00] shadow-[0_10px_24px_rgba(0,0,0,0.14)] backdrop-blur',
  showcaseTitle: 'mt-7 max-w-sm text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white',
  showcaseText: 'mt-4 max-w-sm text-[0.95rem] font-medium leading-7 text-white/78',
  showcaseList: 'mt-8 grid gap-3.5',
  showcaseItem:
    'flex items-start gap-3 rounded-[8px] bg-white/[0.085] p-3.5 text-sm font-semibold leading-6 text-white/84 shadow-[0_12px_30px_rgba(0,0,0,0.10)] backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/[0.115] hover:shadow-[0_18px_40px_rgba(0,0,0,0.16)]',
  showcaseIcon:
    'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#F6BE00]/[0.14] text-[#F6BE00] shadow-[0_8px_18px_rgba(246,190,0,0.10)]',
  showcaseBottom:
    'relative z-10 mt-auto space-y-4 pt-5',
  showcaseStats: 'grid grid-cols-3 gap-3',
  showcaseStat:
    'rounded-[8px] bg-white/[0.105] p-3.5 text-center shadow-[0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/[0.14]',
  showcaseStatValue: 'block text-xl font-extrabold leading-none text-white',
  showcaseStatLabel: 'mt-1.5 block text-[0.68rem] font-bold leading-4 text-white/62',
  showcaseProof:
    'flex items-start gap-3 rounded-[8px] bg-[#07184A]/38 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.14)] backdrop-blur',
  showcaseProofIcon:
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-white/10 text-[#F6BE00]',
  showcaseProofLabel:
    'block text-sm font-extrabold leading-5 text-white',
  showcaseProofText:
    'mt-1 block text-xs font-medium leading-5 text-white/62',
  formColumn: 'flex min-w-0 flex-col justify-center p-4 sm:p-6 lg:p-8',
  container: 'w-full max-w-md lg:max-w-none',
  containerWide: 'w-full',
  bookPage:
    '[perspective:1800px] [transform-style:preserve-3d]',
  bookPageInner:
    'relative [backface-visibility:hidden] [transform-style:preserve-3d] [will-change:transform,opacity] motion-reduce:transition-none',
  bookTurnForward:
    'pointer-events-none origin-left animate-auth-book-turn-forward shadow-[0_30px_90px_rgba(15,23,42,0.20)] motion-reduce:animate-none motion-reduce:opacity-60',
  bookTurnBack:
    'pointer-events-none origin-right animate-auth-book-turn-back shadow-[0_30px_90px_rgba(15,23,42,0.20)] motion-reduce:animate-none motion-reduce:opacity-60',
  bookEnterForward:
    'origin-right animate-auth-book-enter-forward motion-reduce:animate-none',
  bookEnterBack:
    'origin-left animate-auth-book-enter-back motion-reduce:animate-none',
  openBookOverlay:
    'pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-white/85 px-5 py-6 backdrop-blur-[2px]',
  openBookOverlayExit:
    'animate-auth-open-book-overlay-exit motion-reduce:animate-none',
  openBookOverlayEntry:
    'animate-auth-open-book-overlay-entry motion-reduce:animate-none',
  openBookStage:
    'relative h-[min(16rem,72%)] w-[min(25rem,88%)] [perspective:1700px] [transform-style:preserve-3d]',
  openBookShadow:
    'absolute inset-x-4 bottom-2 h-8 rounded-full bg-slate-950/15 blur-2xl',
  openBookPage:
    'absolute top-0 h-full w-1/2 border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-[#EEF4FA] shadow-[0_18px_38px_rgba(15,23,42,0.16)] [backface-visibility:hidden] [transform-style:preserve-3d]',
  openBookLeftPage:
    'left-0 origin-right rounded-l-[8px]',
  openBookRightPage:
    'right-0 origin-left rounded-r-[8px]',
  openBookEntryLeftPage:
    'animate-auth-open-book-entry-left motion-reduce:animate-none',
  openBookEntryRightPage:
    'animate-auth-open-book-entry-right motion-reduce:animate-none',
  openBookCover:
    'absolute top-0 z-20 h-full w-1/2 border border-[#1A1851]/35 bg-[linear-gradient(145deg,#003A8F_0%,#1A1851_100%)] shadow-[0_20px_44px_rgba(0,58,143,0.28)] [backface-visibility:hidden] [transform-style:preserve-3d]',
  openBookCoverForward:
    'right-0 origin-left rounded-r-[8px] animate-auth-open-book-cover-forward motion-reduce:animate-none',
  openBookCoverBack:
    'left-0 origin-right rounded-l-[8px] animate-auth-open-book-cover-back motion-reduce:animate-none',
  openBookLines:
    'absolute inset-5 rounded-[6px] opacity-60 [background-image:linear-gradient(rgba(0,58,143,0.13)_1px,transparent_1px)] [background-size:100%_1.15rem]',
  openBookMargin:
    'absolute inset-y-5 w-px bg-[#F6BE00]/50',
  openBookMarginLeft:
    'right-5',
  openBookMarginRight:
    'left-5',
  openBookSpine:
    'absolute left-1/2 top-0 z-30 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#003A8F]/30 to-transparent shadow-[0_0_20px_rgba(0,58,143,0.18)]',
  openBookBrand:
    'absolute inset-0 flex items-center justify-center text-lg font-extrabold tracking-[-0.04em] text-white sm:text-xl',
  openBookAccent:
    'text-[#F6BE00]',
  bookPageEdge:
    'pointer-events-none absolute inset-y-4 right-0 w-7 rounded-r-[8px] bg-gradient-to-l from-slate-300/80 via-white/80 to-transparent opacity-80 transition-opacity duration-500',
  bookPageEdgeLeft:
    'pointer-events-none absolute inset-y-4 left-0 w-7 rounded-l-[8px] bg-gradient-to-r from-slate-300/80 via-white/80 to-transparent opacity-80 transition-opacity duration-500',
  bookLink:
    'inline-flex items-center gap-1 font-extrabold text-[#003A8F] transition-all duration-200 ease-out hover:-translate-y-px hover:text-[#002C6B] hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20',
  mobileBrand: 'mb-4 text-center sm:mb-6',
  brand: 'mb-5 text-center',
  brandTitle: 'm-0 text-2xl font-extrabold leading-none text-[#003A8F] sm:text-3xl md:text-[2.1rem]',
  brandAccent: 'text-[#F6BE00]',
  brandSubtitle: 'mx-auto mt-1 max-w-md text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6',
  card:
    'relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ease-out hover:shadow-[0_25px_70px_rgba(0,58,143,0.12)] sm:rounded-[2rem] sm:p-6 md:p-8 md:px-9',
  cardStripe: 'absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A1851] via-[#003A8F] to-[#F6BE00]',
  header: 'mb-3 pt-1 text-left sm:mb-5',
  headerPill:
    'mb-2 inline-flex items-center gap-2 rounded-full border border-[#003A8F]/10 bg-[#003A8F]/5 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#003A8F] sm:mb-4 sm:py-1.5 sm:text-xs',
  headerKicker: 'mb-2 text-sm font-bold text-[#003A8F]',
  headerTitle: 'm-0 text-xl font-extrabold leading-tight tracking-[-0.035em] text-[#111827] sm:text-2xl md:text-3xl',
  headerText: 'mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600',
  headerTextLeft: 'mt-3 max-w-lg text-sm leading-6 text-slate-600',
  fieldset:
    'rounded-[8px] border border-slate-200 bg-slate-50/60 p-4 transition-all duration-200 ease-out focus-within:border-[#003A8F]/25 focus-within:bg-white focus-within:shadow-[0_12px_28px_rgba(15,23,42,0.06)]',
  fieldsetTitle:
    'mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.13em] text-slate-500',
  form: 'space-y-3 sm:space-y-3.5',
  formRow: 'grid gap-3.5 sm:grid-cols-2 sm:gap-5',
  formGroup: 'min-w-0',
  label: 'mb-2 block text-sm font-extrabold text-slate-700',
  input:
    'h-11 w-full rounded-xl px-4 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),inset_0_-1px_0_rgba(255,255,255,0.28),0_10px_24px_rgba(15,23,42,0.06)] outline-none backdrop-blur-[14px] transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out placeholder:text-slate-500 placeholder:font-medium placeholder:opacity-90 disabled:cursor-not-allowed disabled:bg-white/55 disabled:text-slate-500 disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] sm:h-11 sm:px-5 sm:text-[0.95rem]',
  inputDefault: 
    'border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.64)] hover:border-white hover:bg-[rgba(255,255,255,0.74)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-1px_0_rgba(255,255,255,0.30),0_14px_30px_rgba(15,23,42,0.08)] focus:border-[#003A8F] focus:bg-[rgba(255,255,255,0.84)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.94),inset_0_-1px_0_rgba(255,255,255,0.36),0_0_0_4px_rgba(0,58,143,0.16),0_16px_34px_rgba(0,58,143,0.14)] focus:outline-none focus-visible:outline-none',
  inputError: 
    'border border-red-300 bg-[rgba(254,242,242,0.86)] focus:border-red-500 focus:bg-white focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_0_0_4px_rgba(239,68,68,0.15),0_16px_34px_rgba(127,29,29,0.12)] focus:outline-none focus-visible:outline-none',
  select:
    'h-11 w-full appearance-none rounded-xl border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.64)] px-4 pr-11 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(255,255,255,0.24),0_10px_24px_rgba(15,23,42,0.06)] outline-none backdrop-blur-[14px] transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:border-white hover:bg-[rgba(255,255,255,0.74)] focus:border-[#003A8F] focus:bg-[rgba(255,255,255,0.84)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.94),inset_0_-1px_0_rgba(255,255,255,0.36),0_0_0_4px_rgba(0,58,143,0.16),0_16px_34px_rgba(0,58,143,0.14)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-white/55 disabled:text-slate-500 sm:h-11 sm:px-5 sm:text-[0.95rem]',
  selectWrap: 'relative',
  selectIcon: 'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#003A8F]/75 transition-colors duration-300',
  passwordField: 'relative',
  passwordInput: 'pr-12',
  passwordToggle:
    // Quiet icon button inside the field: grey at rest, blue on hover and while the password is shown.
    'absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[15px] text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-[#003A8F] aria-pressed:text-[#003A8F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003A8F]/30 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9',
  helperText: 'mt-2 block text-xs font-semibold leading-5 text-slate-700',
  fieldError: 'mt-2 block text-xs font-semibold leading-5 text-red-700',
  formOptions: 'flex flex-nowrap items-center justify-between gap-2 rounded-[8px] bg-slate-50 px-3 py-2 text-xs transition-colors duration-200 focus-within:bg-[#003A8F]/5 sm:gap-3 sm:text-sm',
  checkbox: 'inline-flex items-center gap-2 font-bold text-slate-800',
  checkboxInput:
    'h-4 w-4 rounded border-slate-300 accent-[#003A8F] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20 disabled:cursor-not-allowed',
  forgotLink:
    'border-0 bg-transparent p-0 text-sm font-extrabold text-[#003A8F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)] transition hover:text-[#002C6B] hover:underline disabled:cursor-not-allowed disabled:opacity-60',
  message:
    'rounded-[8px] border px-4 py-3 text-sm font-medium leading-6 shadow-[0_8px_18px_rgba(15,23,42,0.04)]',
  successMessage: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  errorMessage: 'border-red-200 bg-red-50 text-red-800',
  submitButton:
    'group relative overflow-hidden inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#003A8F] bg-[#003A8F] px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(0,58,143,0.24)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#002F75] hover:shadow-[0_16px_34px_rgba(0,58,143,0.32)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:translate-y-0 before:absolute before:inset-0 before:w-[200%] before:-translate-x-[150%] hover:before:translate-x-[150%] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-1000 sm:h-12',
  secondaryButton:
    'inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-800 shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#003A8F]/25 hover:bg-slate-50 hover:text-[#003A8F] hover:shadow-card active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70',
  spinner:
    'h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white',
  footer: 'mt-3 rounded-[8px] border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center transition-colors duration-200 hover:bg-slate-50 sm:mt-5 sm:px-4 sm:py-3.5',
  footerText: 'text-sm leading-6 text-slate-600',
  footerLink: 'font-extrabold text-[#003A8F] transition hover:text-[#002C6B] hover:underline',
  compactNote:
    'rounded-[8px] border border-[#003A8F]/10 bg-[#003A8F]/5 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_8px_18px_rgba(0,58,143,0.04)]',
  noteStrong: 'font-extrabold text-[#003A8F]',
  modalOverlay:
    'fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm',
  modalCard:
    'max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[8px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.03]',
  modalHeader:
    'flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6',
  modalTitleRow: 'flex items-start gap-3',
  modalIcon:
    'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#003A8F]/10 text-[#003A8F]',
  modalTitle: 'm-0 text-xl font-extrabold leading-tight text-slate-950',
  modalText: 'mt-2 text-sm leading-6 text-slate-600',
  modalClose:
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-lg font-bold leading-none text-[#003A8F] shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#003A8F]/25 hover:bg-slate-50 hover:shadow-card focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20 disabled:cursor-not-allowed disabled:opacity-70',
  modalBody: 'space-y-4 px-5 py-5 sm:px-6',
  modalActions:
    'flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-5 sm:flex-row sm:justify-end sm:px-6',
  modalActionButton: 'w-full sm:w-auto',
  // Auth modal (white surface): the glass field/toggle styles above are nearly invisible on white.
  modalField: '!border-slate-200 !bg-slate-50 hover:!bg-white focus:!bg-white',
  modalToggle: ''
};

export function getInputClass(hasError?: boolean) {
  return cx(authUi.input, hasError ? authUi.inputError : authUi.inputDefault);
}

export function getPasswordInputClass(hasError?: boolean) {
  return cx(getInputClass(hasError), authUi.passwordInput);
}

export function getSelectClass(hasError?: boolean) {
  return cx(authUi.select, hasError ? authUi.inputError : authUi.inputDefault);
}

export function getMessageClass(type: 'success' | 'error') {
  return cx(authUi.message, type === 'success' ? authUi.successMessage : authUi.errorMessage);
}
