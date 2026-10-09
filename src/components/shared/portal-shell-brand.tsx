'use client';

import Link from 'next/link';
import { useBranding } from '@/components/branding/branding-provider';
import { SYSTEM_LOGO_SRC } from '@/lib/branding';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type PortalShellBrandProps = {
  href: string;
  title: string;
  subtitle?: string;
  icon: string;
  className?: string;
};

export function PortalShellBrand({
  href,
  title,
  subtitle,
  icon,
  className
}: PortalShellBrandProps) {
  const { branding } = useBranding();
  const normalizedTitle = title.trim().toLowerCase();
  const isSystemName = normalizedTitle === 'thesis track' || normalizedTitle === branding.systemName.trim().toLowerCase();
  const displayTitle = isSystemName ? branding.systemName : title;
  const displaySubtitle = subtitle ?? (isSystemName ? branding.tagline : undefined);
  const logoSrc = isSystemName
    ? branding.assets.mainLogo || branding.assets.lightLogo || branding.assets.darkLogo || SYSTEM_LOGO_SRC
    : '';

  return (
    <Link className={cx('inline-flex min-w-0 items-center gap-3 no-underline', className)} href={href}>
      <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
        {logoSrc ? (
          <img alt={`${displayTitle} logo`} className="relative z-10 h-full w-full object-contain p-1.5" src={logoSrc} />
        ) : (
          <>
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(246,190,0,0.2)_0,rgba(246,190,0,0.08)_18%,transparent_42%),linear-gradient(135deg,rgba(0,58,143,0.08),rgba(0,58,143,0.02))]" />
            <i aria-hidden="true" className={cx('fas relative z-10 text-base text-[#1A1851]', icon)} />
          </>
        )}
      </span>

      <span className="grid min-w-0 gap-0.5">
        {isSystemName && displayTitle.trim().toLowerCase() === 'thesis track' ? (
          <span className="flex items-center gap-1 truncate whitespace-nowrap text-[1.08rem] font-extrabold leading-none tracking-[-0.03em]">
            <span className="text-[#1A1851]">Thesis</span>
            <span className="text-[#F6BE00]">Track</span>
          </span>
        ) : (
          <span className="truncate whitespace-nowrap text-[1.08rem] font-extrabold leading-none tracking-[-0.03em] text-[#1A1851]">
            {displayTitle}
          </span>
        )}
        {displaySubtitle ? <span className="truncate text-[0.72rem] font-semibold text-slate-500">{displaySubtitle}</span> : null}
      </span>
    </Link>
  );
}
