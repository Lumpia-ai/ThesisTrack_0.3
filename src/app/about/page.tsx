import Link from 'next/link';
import type { CSSProperties } from 'react';

import { LandingFooter } from '@/components/public/landing-footer';
import { LandingNavigation } from '@/components/public/landing-navigation';
import { LandingRevealController } from '@/components/public/landing-reveal-controller';
import { PublicLayout } from '@/components/layouts/public-layout';
import { TeamSocialLinks } from '@/components/public/team-social-links';
import { getDepartmentBranding } from '@/config/department-branding';
import { teamMembers } from '@/lib/landing/team-members';
import { prisma } from '@/lib/prisma';
import { adjustColor, sanitizeBrandingSettings, DEFAULT_BRANDING, BRANDING_SETTING_KEY } from '@/lib/branding';

import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'About ThesisTrack | Thesis and Capstone Project Management System'
};

const heroMetrics = [
  { value: '9', label: 'Role-aware portals' },
  { value: '5', label: 'Academic programs' },
  { value: '1', label: 'Managed research record' }
];

const workflowStages = [
  {
    step: '01',
    icon: 'fas fa-pen-to-square',
    title: 'Register',
    owner: 'Students and program staff',
    description: 'Capture group profiles, title proposals, adviser assignment, and project metadata before work begins.',
    artifact: 'Title profile'
  },
  {
    step: '02',
    icon: 'fas fa-comments',
    title: 'Review',
    owner: 'Advisers and panelists',
    description: 'Route chapters, proposals, revisions, and presentation files to the right faculty reviewers.',
    artifact: 'Review trail'
  },
  {
    step: '03',
    icon: 'fas fa-calendar-check',
    title: 'Defend',
    owner: 'Program heads and panels',
    description: 'Coordinate schedules, assign panel chairs and members, then record defense evaluation outcomes.',
    artifact: 'Defense record'
  },
  {
    step: '04',
    icon: 'fas fa-box-archive',
    title: 'Archive',
    owner: 'Research, library, and transfer offices',
    description: 'Move completed outputs into repository, evidence, and technology transfer records for institutional use.',
    artifact: 'Repository entry'
  }
];

const roleWorkspaces = [
  {
    icon: 'fas fa-user-graduate',
    role: 'Students',
    focus: 'Submit and monitor',
    details: 'Register titles, upload documents, follow project stages, and view faculty feedback.'
  },
  {
    icon: 'fas fa-chalkboard-user',
    role: 'Advisers',
    focus: 'Guide and approve',
    details: 'Manage advised groups, review submissions, return comments, and monitor readiness.'
  },
  {
    icon: 'fas fa-user-check',
    role: 'Panelists',
    focus: 'Evaluate and decide',
    details: 'Review defense materials, score presentations, and record panel recommendations.'
  },
  {
    icon: 'fas fa-users-gear',
    role: 'Program Heads',
    focus: 'Coordinate operations',
    details: 'Track department progress, assign panels, schedule defenses, and review workload.'
  },
  {
    icon: 'fas fa-building-columns',
    role: 'Research Heads',
    focus: 'Oversee outcomes',
    details: 'Monitor research outputs, approve key records, and prepare institutional reports.'
  },
  {
    icon: 'fas fa-handshake',
    role: 'Partners and Transfer Staff',
    focus: 'Validate impact',
    details: 'Document adoption, deployment evidence, beneficiaries, and technology transfer status.'
  },
  {
    icon: 'fas fa-book-open-reader',
    role: 'E-Library Users',
    focus: 'Access approved work',
    details: 'Browse approved repository records based on institutional visibility rules.'
  },
  {
    icon: 'fas fa-shield-halved',
    role: 'System Admin',
    focus: 'Configure and secure',
    details: 'Manage accounts, branding, departments, access levels, and system settings.'
  }
];

const capabilityGroups = [
  {
    icon: 'fas fa-route',
    title: 'Academic Workflow',
    description: 'Connects title registration, milestone monitoring, submissions, defense, completion, and archiving.'
  },
  {
    icon: 'fas fa-clipboard-check',
    title: 'Evaluation Support',
    description: 'Keeps adviser feedback, panel roles, scoring, recommendations, and revision outcomes traceable.'
  },
  {
    icon: 'fas fa-chart-line',
    title: 'Program Visibility',
    description: 'Turns department progress, adviser loads, delayed groups, and completion data into operational signals.'
  },
  {
    icon: 'fas fa-folder-tree',
    title: 'Institutional Records',
    description: 'Preserves approved outputs, evidence, repository entries, and technology transfer documentation.'
  }
];

const staticDepartments = [
  {
    code: 'IT',
    focus: 'Software, networks, databases, and applied computing solutions.',
    metric: '480+',
    metricLabel: 'Active students',
    icon: 'fas fa-laptop-code',
    logo: '/department-logo/IT.png'
  },
  {
    code: 'MET',
    focus: 'Mechanical design, fabrication, and digital precision manufacturing.',
    metric: '150+',
    metricLabel: 'Lab units',
    icon: 'fas fa-industry',
    logo: '/department-logo/met.png'
  },
  {
    code: 'TCM',
    focus: 'Technology management, communication systems, and digital media operations.',
    metric: '15',
    metricLabel: 'Industry partners',
    icon: 'fas fa-broadcast-tower',
    logo: '/department-logo/tcm.png'
  },
  {
    code: 'ESM',
    focus: 'Electrical machinery, industrial automation, and energy systems support.',
    metric: '200+',
    metricLabel: 'Equipment units',
    icon: 'fas fa-bolt',
    logo: '/department-logo/esm.png'
  },
  {
    code: 'NAME',
    focus: 'Ship design, marine systems, modeling, and maritime engineering operations.',
    metric: '5 years',
    metricLabel: 'Program duration',
    icon: 'fas fa-ship',
    logo: '/department-logo/name.png'
  }
];



const operatingRules = [
  {
    icon: 'fas fa-id-badge',
    title: 'Account Control',
    text: 'Students can register through the portal, while faculty and staff access is issued by authorized school personnel.'
  },
  {
    icon: 'fas fa-lock',
    title: 'Access Boundaries',
    text: 'Repository and project visibility depend on role, approval status, privacy rules, and institutional policy.'
  },
  {
    icon: 'fas fa-file-circle-check',
    title: 'Data Reliability',
    text: 'Reports and dashboards depend on complete submissions, accurate user updates, and configured academic workflows.'
  }
];

function getTeamRoleIcon(role: string) {
  if (role.includes('Lead Developer') || role.includes('Project Manager')) {
    return 'fas fa-code-branch';
  }

  if (role.includes('Assistant Developer')) {
    return 'fas fa-code';
  }

  if (role.includes('System Analyst') || role.includes('Research')) {
    return 'fas fa-magnifying-glass-chart';
  }

  if (role.includes('Documentation')) {
    return 'fas fa-file-lines';
  }

  return 'fas fa-user-graduate';
}

export default async function AboutPage() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: BRANDING_SETTING_KEY }
  });
  const branding = setting?.value 
    ? sanitizeBrandingSettings(setting.value as any) 
    : sanitizeBrandingSettings(DEFAULT_BRANDING);
    
  const activeDepartments = branding.departments.filter(d => d.active);
  return (
    <PublicLayout>
      <div className={styles.landingPage}>
        <LandingNavigation />

        <main className={styles.main}>
          <section className={styles.aboutPageHero} id="about-thesistrack">
            <div className={styles.aboutHeroScene} aria-hidden="true">
              <div className={styles.aboutSceneChrome}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.aboutSceneGrid}>
                <div className={styles.aboutScenePanel}>
                  <span>Defense Queue</span>
                  <strong>12 scheduled</strong>
                  <i className="fas fa-calendar-check" />
                </div>
                <div className={styles.aboutScenePanel}>
                  <span>Review Progress</span>
                  <strong>84%</strong>
                  <i className="fas fa-chart-line" />
                </div>
                <div className={styles.aboutSceneWidePanel}>
                  <span>Capstone Lifecycle</span>
                  <div>
                    <b>Register</b>
                    <b>Review</b>
                    <b>Defend</b>
                    <b>Archive</b>
                  </div>
                </div>
                <div className={styles.aboutScenePanel}>
                  <span>Repository</span>
                  <strong>Ready</strong>
                  <i className="fas fa-box-archive" />
                </div>
              </div>
            </div>

            <div className={styles.container}>
              <div className={styles.aboutHeroContent} data-reveal="fade-up">
                <span className={styles.sectionKicker}>About the System</span>
                <h1>
                  <span>ThesisTrack</span> System Overview
                </h1>
                <p>
                  ThesisTrack is a role-based thesis and capstone management system for higher
                  education institutions. It gives students, faculty, program leaders, research
                  offices, library staff, and partners one coordinated place to manage academic
                  outputs from proposal to repository and technology transfer.
                </p>

                <div className={styles.teaserActions}>
                  <Link href="#system-model" className={styles.buttonPrimary}>
                    <span className={styles.buttonText}>View System Model</span>
                    <span className={styles.buttonIcon} aria-hidden="true">
                      <i className="fas fa-arrow-down" />
                    </span>
                  </Link>
                  <Link href="#role-workspaces" className={styles.buttonSecondary}>
                    <span className={styles.buttonText}>Explore User Roles</span>
                    <span className={styles.buttonIcon} aria-hidden="true">
                      <i className="fas fa-users" />
                    </span>
                  </Link>
                </div>
              </div>

              <div className={styles.aboutHeroMetrics} aria-label="System scope" data-reveal="fade-up">
                {heroMetrics.map(metric => (
                  <div key={metric.label}>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="system-model" className={styles.systemModelSection}>
            <div className={styles.container}>
              <div className={styles.systemIntroGrid}>
                <div className={styles.sectionIntro} data-reveal="fade-up">
                  <span className={styles.sectionKicker}>System Model</span>
                  <h2>
                    Built around the actual <span>capstone lifecycle</span>
                  </h2>
                  <p>
                    The system follows the way academic research work moves in school:
                    registration, review, defense, repository, and transfer evidence. Each step
                    keeps ownership, deadlines, files, and decisions visible.
                  </p>
                </div>

                <aside className={styles.systemDefinitionPanel} data-reveal="fade-up">
                  <span>Primary Purpose</span>
                  <p>
                    Centralize thesis and capstone records so every stakeholder works from the
                    same project profile, review history, evaluation record, and institutional
                    archive.
                  </p>
                </aside>
              </div>

              <div className={styles.processGrid}>
                {workflowStages.map(stage => (
                  <article key={stage.title} className={styles.processCard} data-reveal="fade-up">
                    <div className={styles.processCardTop}>
                      <span>{stage.step}</span>
                      <i className={stage.icon} aria-hidden="true" />
                    </div>
                    <h3>{stage.title}</h3>
                    <strong>{stage.owner}</strong>
                    <p>{stage.description}</p>
                    <em>{stage.artifact}</em>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.capabilitySection}>
            <div className={styles.container}>
              <div className={styles.sectionIntro} data-reveal="fade-up">
                <span className={styles.sectionKicker}>Core Capabilities</span>
                <h2>
                  What the system <span>organizes</span>
                </h2>
                <p>
                  ThesisTrack is designed as an academic operations tool: quiet, structured,
                  auditable, and focused on the records people need to move work forward.
                </p>
              </div>

              <div className={styles.capabilityGrid}>
                {capabilityGroups.map(capability => (
                  <article key={capability.title} className={styles.capabilityCard} data-reveal="fade-up">
                    <span aria-hidden="true">
                      <i className={capability.icon} />
                    </span>
                    <div>
                      <h3>{capability.title}</h3>
                      <p>{capability.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="role-workspaces" className={styles.roleWorkspaceSection}>
            <div className={styles.container}>
              <div className={styles.roleWorkspaceHeader}>
                <div className={styles.sectionIntro} data-reveal="fade-up">
                  <span className={styles.sectionKicker}>User Workspaces</span>
                  <h2>
                    One system, <span>different responsibilities</span>
                  </h2>
                  <p>
                    Each portal removes unrelated tasks and presents the records, approvals,
                    files, and dashboards needed by that user group.
                  </p>
                </div>
              </div>

              <div className={styles.roleMatrix}>
                {roleWorkspaces.map(role => (
                  <article key={role.role} className={styles.roleCard} data-reveal="fade-up">
                    <span className={styles.roleIcon} aria-hidden="true">
                      <i className={role.icon} />
                    </span>
                    <div>
                      <h3>{role.role}</h3>
                      <strong>{role.focus}</strong>
                      <p>{role.details}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.departmentSystemSection} id="about-departments">
            <div className={styles.container}>
              <div className={styles.departmentSystemGrid}>
                <div className={styles.departmentSystemIntro} data-reveal="fade-right">
                  <span className={styles.sectionKicker}>About Departments</span>
                  <h2>
                    {branding.programsContent.title.split(' ').map((word: string, i: number, arr: string[]) => 
                      i === arr.length - 1 ? <span key={i}>{word}</span> : `${word} `
                    )}
                  </h2>
                  <p>
                    {branding.programsContent.description}
                  </p>

                  <div className={styles.departmentInsightGrid} aria-label="Department coverage summary">
                    {branding.programsContent.highlights.filter((h: any) => h.visible).map((highlight: any) => (
                      <div key={highlight.label} className={styles.departmentInsightCard}>
                        <strong>{highlight.value}</strong>
                        <span>{highlight.label}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/departments/IT" className={styles.departmentExploreLink}>
                    <span>Start with BSIT Program</span>
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </Link>
                </div>

                <div className={styles.departmentLogoGrid} data-reveal="fade-left">
                  {activeDepartments.map(department => {
                    const fallbackData = staticDepartments.find(d => d.code === department.id);
                    const isDefault = !!fallbackData;
                    const originalBranding = isDefault ? getDepartmentBranding(department.id) : null;
                    
                    const focusText = isDefault ? fallbackData!.focus : department.description;
                    const codeLabel = isDefault ? originalBranding!.code : (department.shortName || department.id);
                    const primaryColor = department.color;
                    const secondaryColor = department.secondaryColor || adjustColor(primaryColor, { lightness: -15, saturation: 10 });
                    const highlightColor = adjustColor(primaryColor, { lightness: 20 });
                    const accentColor = adjustColor(primaryColor, { hue: 20, saturation: 20 });

                    return (
                      <Link
                        key={department.id}
                        href={`/departments/${department.id}`}
                        className={styles.departmentLogoCard}
                        style={{
                          '--department-primary': primaryColor,
                          '--department-secondary': secondaryColor,
                          '--department-accent': accentColor,
                          '--department-highlight': highlightColor
                        } as CSSProperties}
                      >
                        <div className={styles.departmentLogoMark}>
                          <img
                            src={department.logo || (fallbackData ? fallbackData.logo : '')}
                            alt={`${department.name} logo`}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className={styles.departmentCardBody}>
                          <div className={styles.departmentCardContent}>
                            <div className={styles.departmentCardTopline}>
                              <span>{codeLabel}</span>
                            </div>
                            <strong>{department.name}</strong>
                            <p>{focusText}</p>
                          </div>
                          <div className={styles.departmentCardFooter}>
                            <em>
                              Explore
                              <i className="fas fa-arrow-right" aria-hidden="true" />
                            </em>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.systemRulesSection}>
            <div className={styles.container}>
              <div className={styles.systemRulesBand} data-reveal="fade-up">
                <div className={styles.sectionIntro}>
                  <span className={styles.sectionKicker}>Controls and Boundaries</span>
                  <h2>
                    Reliable records need <span>clear rules</span>
                  </h2>
                </div>

                <div className={styles.systemRulesGrid}>
                  {operatingRules.map(rule => (
                    <article key={rule.title} className={styles.systemRuleCard}>
                      <i className={rule.icon} aria-hidden="true" />
                      <h3>{rule.title}</h3>
                      <p>{rule.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            id="capstone-team"
            aria-labelledby="capstone-team-title"
            className="relative overflow-hidden bg-[#060D1A] py-24 sm:py-32 isolate"
          >
            {/* Ambient Dark Mode Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[radial-gradient(ellipse_at_top,rgba(0,58,143,0.15),transparent_70%)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_bottom_left,rgba(246,190,0,0.06),transparent_60%)] pointer-events-none blur-3xl" />
            <div className="absolute top-1/4 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(65,139,255,0.08),transparent_60%)] pointer-events-none blur-3xl" />

            <div className="relative z-10 w-[min(1400px,calc(100%-3rem))] mx-auto">
              <div className="flex flex-col items-center text-center mb-16 sm:mb-20" data-reveal="fade-up">
                <span className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#f6be00]/20 bg-[#f6be00]/10 px-4 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-[#f6be00] backdrop-blur-md">
                  <i className="fas fa-users-gear" /> Capstone Team
                </span>
                <h2 id="capstone-team-title" className="m-0 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  Meet the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe98b] to-[#f6be00]">Developers</span>
                </h2>
                <p className="max-w-2xl mx-auto mt-6 text-[1rem] text-slate-300 leading-[1.7]">
                  The people behind the Thesis and Capstone Project Inventory, Progress
                  Monitoring, and Technology Transfer Management System.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {teamMembers.map((member, index) => (
                  <article
                    key={member.id}
                    className="group relative flex flex-col items-center text-center rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 sm:p-10 transition-all duration-500 ease-out hover:bg-white/[0.06] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(0,58,143,0.2)] overflow-hidden"
                    data-reveal="fade-up"
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    {/* Subtle Top Glow on Hover */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#418bff] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-6 rounded-full p-1 bg-gradient-to-b from-white/20 to-transparent">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white/10 relative">
                        <img
                          src={member.image}
                          alt={`${member.name} profile image`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                        />
                      </div>
                      {/* Avatar Ring Glow */}
                      <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_25px_rgba(65,139,255,0.3)] transition-shadow duration-500" />
                    </div>
                    
                    <h3 className="text-xl sm:text-[1.35rem] font-black text-white mb-3">
                      {member.name}
                    </h3>
                    
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#003A8F]/40 border border-[#003A8F]/60 text-[#93c5fd] text-[0.65rem] font-bold uppercase tracking-widest mb-5">
                      <i className={getTeamRoleIcon(member.role)} aria-hidden="true" />
                      {member.role}
                    </div>
                    
                    <p className="text-[0.85rem] text-slate-400 leading-[1.65] font-medium">
                      {member.shortBio}
                    </p>

                    <TeamSocialLinks member={member} />
                  </article>
                ))}
              </div>

              <div className="mt-16 sm:mt-24 max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-white/5 to-transparent border border-white/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left" data-reveal="fade-up">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#f6be00]/20 text-[#f6be00] text-xl shrink-0">
                  <i className="fas fa-quote-left" aria-hidden="true" />
                </div>
                <p className="text-lg text-slate-300 font-medium italic">
                  "Built with dedication for better academic research management."
                </p>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
        <LandingRevealController />
      </div>
    </PublicLayout>
  );
}
