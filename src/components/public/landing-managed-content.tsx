'use client';

import Link from 'next/link';
import { type CSSProperties, type MouseEvent, useState } from 'react';
import { AuthModal, type AuthView, getAuthViewForHref, shouldOpenAuthModal } from '@/components/auth/auth-modal';
import { useBranding } from '@/components/branding/branding-provider';
import styles from '@/app/page.module.css';

export function LandingManagedHero() {
  const { branding } = useBranding();
  const [authView, setAuthView] = useState<AuthView | null>(null);
  const landing = branding.landing;
  const hasHeroImage = landing.showHeroImage && landing.heroImage.trim();
  const heroTitle = landing.heroTitle.trim();
  const preferredAccentPhrase = 'Project Management System';
  const preferredAccentIndex = heroTitle.toLowerCase().lastIndexOf(preferredAccentPhrase.toLowerCase());
  const fallbackTitleWords = heroTitle.split(/\s+/).filter(Boolean);
  const fallbackAccent = fallbackTitleWords.pop() || '';
  const titleLead = preferredAccentIndex >= 0
    ? heroTitle.slice(0, preferredAccentIndex).trimEnd()
    : fallbackTitleWords.join(' ');
  const titleAccent = preferredAccentIndex >= 0
    ? heroTitle.slice(preferredAccentIndex).trimStart()
    : fallbackAccent;
  const ctaAlignmentClass = landing.textAlignment === 'center'
    ? 'justify-center'
    : landing.textAlignment === 'right'
      ? 'justify-end'
      : 'justify-start';
  const heroStyle = {
    '--landing-hero-primary': branding.colors.primary,
    '--landing-hero-accent': branding.colors.accent,
    textAlign: landing.textAlignment
  } as CSSProperties;
  const titleStyle = {
    color: branding.colors.primary
  } as CSSProperties;
  const titleAccentStyle = {
    color: branding.colors.accent
  } as CSSProperties;
  const paragraphStyle = {
    marginLeft: landing.textAlignment === 'left' ? 0 : 'auto',
    marginRight: landing.textAlignment === 'right' ? 0 : 'auto'
  } as const;
  const primaryCtaStyle = {
    backgroundColor: branding.colors.primary,
    boxShadow: `0 14px 28px color-mix(in srgb, ${branding.colors.primary} 24%, transparent)`
  } as CSSProperties;
  // CTA links are admin-configurable: a /login or /register link opens the auth modal on a plain click
  // (new-tab/middle clicks still reach the full page); any other link navigates as usual.
  const openAuthModalFor = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const view = getAuthViewForHref(href);

    if (view && shouldOpenAuthModal(event)) {
      event.preventDefault();
      setAuthView(view);
    }
  };
  const secondaryCtaStyle = {
    borderColor: branding.colors.accent,
    color: branding.colors.primary
  } as CSSProperties;

  return (
    <div className={hasHeroImage ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] lg:items-center' : 'grid justify-items-center'}>
      <div className={styles.heroContent} data-reveal="fade-up" style={heroStyle}>
        <span className={styles.heroBadge}>
          <i className="fas fa-graduation-cap" aria-hidden="true" />
          {landing.subtitle}
        </span>
        <h1 style={titleStyle}>
          {titleLead ? <span>{`${titleLead} `}</span> : null}
          <span className={styles.heroTitleAccent} style={titleAccentStyle}>{titleAccent}</span>
        </h1>
        <p style={paragraphStyle}>{landing.description}</p>
        {landing.showCtaButtons ? (
          <div className={`${styles.heroActions} mt-7 flex flex-wrap gap-3 ${ctaAlignmentClass}`}>
            <Link href={landing.primaryCtaLink} onClick={openAuthModalFor(landing.primaryCtaLink)} className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white transition-transform duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" style={primaryCtaStyle}>
              {landing.primaryCtaText}
            </Link>
            <Link href={landing.secondaryCtaLink} onClick={openAuthModalFor(landing.secondaryCtaLink)} className="inline-flex min-h-12 items-center justify-center rounded-full border bg-white px-6 text-sm font-black shadow-sm transition-transform duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" style={secondaryCtaStyle}>
              {landing.secondaryCtaText}
            </Link>
          </div>
        ) : null}
      </div>
      {hasHeroImage ? (
        <div className="relative min-h-[260px] overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_20px_60px_rgba(15,43,89,0.08)]" data-reveal="fade-left">
          <img alt="" className="h-full min-h-[260px] w-full object-cover" src={landing.heroImage} />
        </div>
      ) : null}
      <AuthModal view={authView} onViewChange={setAuthView} onClose={() => setAuthView(null)} />
    </div>
  );
}

export function LandingManagedFeatureRow() {
  const { branding } = useBranding();
  const features = branding.landing.features.filter((feature) => feature.visible);

  return (
    <>
      {features.map((feature) => (
        <article key={feature.id} className={styles.featureItem} data-reveal="fade-up">
          <div className={styles.featureIcon} aria-hidden="true">
            <i className={`fas ${feature.icon}`} />
          </div>
          <div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        </article>
      ))}
    </>
  );
}

export function LandingManagedAboutSummary() {
  const { branding } = useBranding();
  const landing = branding.landing;
  const metrics = landing.statistics.filter((item) => item.visible);

  return (
    <>
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[0.7rem] font-black uppercase tracking-widest text-[#003a8f] bg-[#ebf5ff]/80 backdrop-blur-md border border-[#dbe9fb] rounded-full shadow-sm ring-1 ring-white">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#003a8f]"></span>
        </span>
        About the System
      </div>
      <h2 className="font-serif text-[clamp(2.2rem,4vw,3.2rem)] font-black text-[#003a8f] leading-[1.1] mb-6 tracking-tight">
        {landing.aboutTitle}
      </h2>
      <p className="text-[1.05rem] text-[#536982] leading-[1.75] mb-10 max-w-xl font-medium">
        {landing.aboutDescription}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5" aria-label="System scope">
        {metrics.map((metric) => (
          <div key={metric.id} className="flex-1 bg-white/90 backdrop-blur-sm border border-[#e2eaf5] shadow-[0_8px_20px_rgba(15,43,89,0.03)] rounded-[1.2rem] p-4 sm:p-5 text-center group-hover:border-[#c6d7ef] hover:shadow-[0_10px_22px_rgba(15,43,89,0.06)] transition-all duration-200">
            <strong className="block text-[1.5rem] sm:text-[1.8rem] font-black text-[#003a8f] mb-0.5 sm:mb-1">{metric.value}</strong>
            <span className="text-[0.65rem] sm:text-[0.7rem] font-bold text-[#66758a] uppercase tracking-wider">{metric.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
