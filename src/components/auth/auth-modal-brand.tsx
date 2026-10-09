'use client';

import { BrandName, BrandTagline } from '@/components/branding/brand-copy';
import { LogoIcon } from '@/components/branding/logo-icon';

/**
 * Compact horizontal brand lockup (icon + wordmark + tagline) for the top of the auth modal.
 * Built from the live branding (logo, system name, tagline, colors) rather than a flat image,
 * and kept short so the form stays the focus and the register view doesn't scroll sooner.
 */
export function AuthModalBrand() {
  return (
    <div className="mb-5 flex justify-center">
      <div className="inline-flex items-center gap-3">
        <LogoIcon style={{ width: 'auto' }} className="h-11 shrink-0" />
        <div className="text-left">
          <p className="m-0 text-[1.45rem] font-black leading-none tracking-[-0.01em] text-[color:var(--color-primary,#003A8F)]">
            <BrandName accentClassName="text-[color:var(--color-accent,#F6BE00)]" />
          </p>
          <BrandTagline className="mt-1 block text-[0.7rem] font-medium tracking-[0.02em] text-slate-500" />
        </div>
      </div>
    </div>
  );
}
