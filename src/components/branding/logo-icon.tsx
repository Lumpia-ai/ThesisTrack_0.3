'use client';

import React from 'react';
import { useBranding } from '@/components/branding/branding-provider';
import { SYSTEM_LOGO_SRC } from '@/lib/branding';

export function LogoIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { branding } = useBranding();
  const logoSrc = branding.assets.mainLogo || branding.assets.darkLogo || branding.assets.lightLogo || SYSTEM_LOGO_SRC;

  return (
    <img
      alt=""
      aria-hidden="true"
      className={className}
      decoding="async"
      src={logoSrc}
      style={style}
    />
  );
}
