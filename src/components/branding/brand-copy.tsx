'use client';

import { useBranding } from '@/components/branding/branding-provider';

type BrandNameProps = {
  className?: string;
  accentClassName?: string;
  fallbackName?: string;
};

export function BrandName({
  className,
  accentClassName,
  fallbackName = 'ThesisTrack'
}: BrandNameProps) {
  const { branding } = useBranding();
  const name = branding.systemName || fallbackName;

  if (name.trim().toLowerCase() === 'thesis track' || name.trim().toLowerCase() === 'thesistrack') {
    const content = (
      <>
        Thesis<span className={accentClassName}>Track</span>
      </>
    );

    return className ? (
      <span className={className}>
        {content}
      </span>
    ) : (
      content
    );
  }

  return className ? <span className={className}>{name}</span> : <>{name}</>;
}

export function BrandTagline({
  className,
  fallback = 'Higher Education Institutions'
}: {
  className?: string;
  fallback?: string;
}) {
  const { branding } = useBranding();

  return <span className={className}>{branding.tagline || fallback}</span>;
}
