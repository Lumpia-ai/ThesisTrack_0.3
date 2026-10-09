'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { LandingRevealController } from "@/components/public/landing-reveal-controller";
import { LandingFooter } from "@/components/public/landing-footer";
import { DepartmentSectionNavigation } from "@/components/public/department-section-navigation";
import { HallOfExcellence } from "@/components/public/hall-of-excellence";
import { DepartmentChart } from "@/components/public/department-chart";
import { getDepartmentBranding } from "@/config/department-branding";
import { adjustColor } from "@/lib/branding";
import { useBranding } from "@/components/branding/branding-provider";
import styles from "@/app/page.module.css";

export function DepartmentClientContent({
  initialDepartment,
  managedDepartmentsData,
  isBrandingPreview
}: {
  initialDepartment: any;
  managedDepartmentsData: any[];
  isBrandingPreview: boolean;
}) {
  const { branding: liveBranding } = useBranding();
  const searchParams = useSearchParams();
  const previewIndex = searchParams.get('previewIndex');
  
  // Use live draft data if in preview mode, otherwise use initial data
  let liveDept = null;
  if (isBrandingPreview) {
    liveDept = previewIndex !== null 
      ? liveBranding.departments[parseInt(previewIndex, 10)] 
      : liveBranding.departments.find(d => d.id === initialDepartment.id);
  }
  
  const department = liveDept 
    ? { ...initialDepartment, ...liveDept }
    : initialDepartment;

  const branding = getDepartmentBranding(department.id);
  const primaryColor = department.color ?? branding.primaryColor;
  const secondaryColor = department.secondaryColor || adjustColor(primaryColor, { lightness: -15, saturation: 10 });
  const highlightColor = adjustColor(primaryColor, { lightness: 20 });
  const accentColor = adjustColor(primaryColor, { hue: 20, saturation: 20 });

  const departmentStyle = {
    "--department-color": primaryColor,
    "--department-primary": primaryColor,
    "--department-secondary": secondaryColor,
    "--department-accent": accentColor,
    "--department-highlight": highlightColor,
    "--department-text": branding.textColor
  } as CSSProperties;
  const heroStats = (department.stats || []).slice(0, 4);
  const featuredAreas = (department.keyAreas || []).slice(0, 3);
  const heroDescription =
    (department.description || '').length > 220
      ? `${department.description.slice(0, 220).trim()}...`
      : department.description;
  const departmentName = department.name ?? branding.departmentName;

  return (
    <div className={styles.landingPage} style={departmentStyle}>
      <LandingRevealController />
      {/* Simplified Navbar */}
      {!isBrandingPreview && (
        <header className={`${styles.navbar} ${styles.departmentNavbar}`}>
          <div className={`${styles.container} ${styles.navbarInner} ${styles.departmentNavbarInner}`}>
            <DepartmentSectionNavigation />
          </div>
        </header>
      )}

      <main className={`${styles.main} ${styles.departmentDetailMain}`} style={departmentStyle}>
        {/* ── HERO SECTION ── */}
        <section className={styles.departmentHeroSection}>
          <div className={styles.container}>
            <div className={styles.departmentHeroGrid}>
              <div className={styles.departmentHeroCopy} data-reveal="fade-up">
                <span className={styles.departmentHeroBadge}>
                  <i className={department.icon ?? 'fas fa-building'} aria-hidden="true" />
                  {department.shortName ?? branding.code} Program
                </span>

                <h1>{departmentName}</h1>
                <p>{heroDescription}</p>

                <div className={styles.departmentHeroActions}>
                  <Link href="#program-overview" className={styles.departmentHeroPrimaryAction}>
                    <span>Read Program Profile</span>
                    <i className="fas fa-arrow-down" aria-hidden="true" />
                  </Link>
                  <Link href="#research-focus" className={styles.departmentHeroSecondaryAction}>
                    <span>View Focus Areas</span>
                    <i className="fas fa-layer-group" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={styles.departmentProfilePanel} data-reveal="fade-left" aria-label={`${branding.code} profile summary`}>
                <div className={styles.departmentProfileHeader}>
                  <div className={styles.departmentProfileLogo}>
                    {department.logo ? (
                      <img src={department.logo} alt={`${departmentName} logo`} />
                    ) : (
                      <i className={department.icon ?? 'fas fa-building'} aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <span>{department.profileCard?.heading || 'PROGRAM PROFILE'}</span>
                    <strong>{department.shortName ?? branding.code}</strong>
                  </div>
                </div>

                <div className={styles.departmentProfileFocus}>
                  {(() => {
                    const profileFeatures = department.profileCard?.features?.filter((f: string) => f) || [];
                    if (profileFeatures.length > 0) {
                      return profileFeatures.map((feature: string, idx: number) => (
                        <div key={idx}>
                          <i className="fas fa-check-circle" aria-hidden="true" style={{ color: 'var(--department-primary)' }} />
                          <span>{feature}</span>
                        </div>
                      ));
                    }
                    return featuredAreas.map((area: any) => (
                      <div key={area.title}>
                        <i className={area.icon} aria-hidden="true" />
                        <span>{area.title}</span>
                      </div>
                    ));
                  })()}
                </div>

                <div className={styles.departmentProfileRoute}>
                  <span>{department.profileCard?.workflowHeading || 'WORKFLOW COVERAGE'}</span>
                  <strong>{department.profileCard?.workflowText || 'Register, review, defend, archive'}</strong>
                </div>
              </aside>
            </div>

            {/* ── STATS ROW ── */}
            <div className={styles.departmentStatsGrid} data-reveal="fade-up">
              {heroStats.map((stat: any) => (
                <article key={stat.label} className={styles.departmentStatCard}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>

            {/* ── ABOUT THE PROGRAM ── */}
            <div id="program-overview" className={`${styles.departmentOverviewWrap} ${styles.departmentAnchorSection}`} data-reveal="fade-up" style={{ '--reveal-delay': '0.08s' } as any}>
              <article className={styles.departmentOverviewCard}>
                <div className={styles.departmentOverviewIntro}>
                  <div className={styles.departmentOverviewHeading}>
                    <div className={styles.departmentOverviewIcon}>
                      <i className="fas fa-book-open text-xl" />
                    </div>
                    <h2>
                      About the <br className="hidden md:block" />Program
                    </h2>
                  </div>
                  <div className={styles.departmentOverviewCopy}>
                    <p>
                      {department.description}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>


        {/* ── KEY RESEARCH AREAS ── */}
        <section id="research-focus" className={`${styles.departmentAnchorSection} pb-16 sm:pb-20`}>
          <div className={styles.container}>
            <div className="text-center mb-12 max-w-3xl mx-auto" data-reveal="fade-up" style={{ '--reveal-delay': '0.15s' } as any}>
              <h2 className="text-sm font-bold uppercase tracking-widest text-brand mb-3">{department.keyAreasSubheading || 'Areas of Excellence'}</h2>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{department.keyAreasHeading || 'Key Research & Focus Areas'}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto" data-reveal="fade-up" style={{ '--reveal-delay': '0.2s' } as any}>
              {(department.keyAreas || []).map((area: any) => (
                <div
                  key={area.title}
                  className="group relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,58,143,0.08)] transition-all duration-500 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-50/60 to-transparent rounded-bl-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl mb-5 shadow-inner ring-1"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${branding.highlightColor} 18%, white)`,
                        color: branding.primaryColor,
                        borderColor: `color-mix(in srgb, ${branding.secondaryColor} 18%, white)`,
                      }}
                    >
                      {area.icon && (area.icon.startsWith('http') || area.icon.startsWith('data:')) ? (
                        <img src={area.icon} alt={area.title} className="w-6 h-6 object-contain" />
                      ) : (
                        <i className={`${area.icon} text-lg`} />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{area.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-[0.9rem]">{area.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHART + SIDEBAR ── */}
        <section id="department-resources" className={`${styles.departmentAnchorSection} pb-16 sm:pb-20`}>
          <div className={styles.container}>
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-start max-w-6xl mx-auto" data-reveal="fade-up" style={{ '--reveal-delay': '0.25s' } as any}>
              
              {/* Left: Facilities & Program Highlights */}
              <div className="space-y-6">
                {/* Facilities */}
                <article className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 sm:p-10 transition-shadow duration-500 hover:shadow-[0_8px_40px_rgb(0,58,143,0.08)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/40 to-white/80 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-5 shadow-inner ring-1 ring-emerald-100/50">
                      <i className="fas fa-flask text-xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-5">Facilities & Labs</h2>
                    <ul className="space-y-3">
                      {(department.facilities || []).map((facility: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-gray-600 text-[0.9rem]">
                          <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-emerald-400" />
                          {facility}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>

                {/* Program Highlights */}
                <article className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 sm:p-10 transition-shadow duration-500 hover:shadow-[0_8px_40px_rgb(0,58,143,0.08)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/40 to-white/80 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-5 shadow-inner ring-1 ring-violet-100/50">
                      <i className="fas fa-star text-xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-5">Program Highlights</h2>
                    <ul className="space-y-3">
                      {(department.programHighlights || []).map((highlight: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-gray-600 text-[0.9rem]">
                          <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-violet-400" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </div>

              {/* Right: Chart + Department Navigation */}
              <div className="space-y-6">
                <aside className="w-full rounded-3xl" style={{ height: '500px', '--reveal-delay': '0.3s' } as any} data-reveal="fade-left">
                  <DepartmentChart departmentId={department.id} chartData={department.chartData} />
                </aside>

                {/* Department Navigation */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 transition-shadow duration-500 hover:shadow-[0_8px_40px_rgb(0,58,143,0.08)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/40 to-white/80 pointer-events-none rounded-3xl" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-brand mb-6 flex items-center gap-2 relative z-10">
                    Explore Other Departments
                  </h3>
                  <div className="flex flex-wrap gap-4 relative z-10">
                    {managedDepartmentsData.map(dept => {
                      const isActive = department.id === dept.id;
                      const navBranding = getDepartmentBranding(dept.id);
                      return (
                        <Link
                          key={dept.id}
                          href={`/departments/${dept.id}`}
                          className={`
                            group relative overflow-hidden inline-flex items-center justify-center min-w-[5rem] px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300
                            ${isActive 
                              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-[0_8px_20px_rgb(246,190,0,0.3)] ring-1 ring-amber-400/50 scale-105" 
                              : "bg-white text-gray-700 shadow-sm ring-1 ring-gray-200 hover:text-amber-600 hover:ring-amber-400/50 hover:bg-amber-50/50 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgb(246,190,0,0.2)]"
                            }
                          `}
                        >
                          {isActive && (
                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                          )}
                          <span className="relative z-10 flex items-center gap-2">
                            {navBranding.code} 
                            {!isActive && <i className="fas fa-arrow-right text-[0.7rem] opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HALL OF EXCELLENCE ── */}
        <HallOfExcellence filterDepartmentId={department.id} />

        {/* ── CTA SECTION ── */}
        <section className="pb-20 sm:pb-28">
          <div className={styles.container}>
            <div
              className="relative overflow-hidden max-w-5xl mx-auto bg-gradient-to-br from-brand via-blue-800 to-brand rounded-3xl p-10 sm:p-14 text-center shadow-[0_20px_60px_rgb(0,58,143,0.3)]"
              data-reveal="fade-up"
              style={{ '--reveal-delay': '0.35s' } as any}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(251,191,36,0.08),transparent_50%)] pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm text-white mb-6 ring-1 ring-white/20">
                  <i className={`${department.icon} text-2xl`} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                  Ready to Start Your {branding.code} Capstone?
                </h2>
                <p className="text-blue-100/90 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                  ThesisTrack streamlines the entire research lifecycle for the <strong className="text-white">{departmentName}</strong> department — from title proposal to final defense.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 bg-white text-brand px-8 py-3.5 rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <i className="fas fa-sign-in-alt" />
                    Sign In to ThesisTrack
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {!isBrandingPreview && <LandingFooter />}
      
      {/* Global styles for specific animations used above */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 8s ease infinite;
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
