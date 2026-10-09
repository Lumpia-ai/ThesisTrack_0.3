import Link from 'next/link';
import type { CSSProperties } from 'react';

import { HallOfExcellence } from '@/components/public/hall-of-excellence';
import { LandingFooter } from '@/components/public/landing-footer';
import {
  LandingManagedAboutSummary,
  LandingManagedFeatureRow,
  LandingManagedHero
} from '@/components/public/landing-managed-content';
import { LandingNavigation } from '@/components/public/landing-navigation';
import { LandingRevealController } from '@/components/public/landing-reveal-controller';
import { PublicLayout } from '@/components/layouts/public-layout';

import styles from './page.module.css';

export const metadata = {
  title: 'ThesisTrack | Thesis and Capstone Project Management System'
};

const modules = [
  {
    icon: 'fas fa-pen-to-square',
    badge: 'Registration',
    audience: 'Students and advisers',
    title: 'Title Registration',
    description: 'Register groups, submit title proposals, and route them for adviser and panel approval.',
    capabilities: ['Group and member profiles', 'Title similarity checking', 'Approval tracking']
  },
  {
    icon: 'fas fa-chart-line',
    badge: 'Monitoring',
    audience: 'Advisers and program heads',
    title: 'Progress Monitoring',
    description: 'Follow project stages, checkpoints, submissions, and progress reports for every group.',
    capabilities: ['Project stage checkpoints', 'Review comments', 'Progress reports']
  },
  {
    icon: 'fas fa-calendar-check',
    badge: 'Defense',
    audience: 'Panels and program heads',
    title: 'Defense and Evaluation',
    description: 'Schedule defenses, assign panel roles, and record evaluation outcomes and decisions.',
    capabilities: ['Defense scheduling', 'Panel evaluation', 'Chair decisions']
  },
  {
    icon: 'fas fa-box-archive',
    badge: 'Archive',
    audience: 'Research, library, and partners',
    title: 'Repository and Transfer',
    description: 'Publish completed research to the repository and manage technology transfer requests.',
    capabilities: ['Public research repository', 'Adoption requests', 'Impact evidence']
  }
];

const workflowSteps = [
  {
    icon: 'fas fa-user-plus',
    title: 'Register',
    description: 'Students create their group and submit title proposals.',
    artifact: 'Title profile'
  },
  {
    icon: 'fas fa-comments',
    title: 'Review',
    description: 'Advisers review proposals and return feedback on submissions.',
    artifact: 'Review trail'
  },
  {
    icon: 'fas fa-list-check',
    title: 'Monitor',
    description: 'Project stages and checkpoints track progress through each term.',
    artifact: 'Progress report'
  },
  {
    icon: 'fas fa-gavel',
    title: 'Defend',
    description: 'Panels evaluate the defense and record their recommendations.',
    artifact: 'Defense record'
  },
  {
    icon: 'fas fa-book',
    title: 'Archive',
    description: 'Approved outputs are published to the research repository.',
    artifact: 'Repository entry'
  },
  {
    icon: 'fas fa-handshake',
    title: 'Transfer',
    description: 'Partners adopt research and document deployment and impact.',
    artifact: 'Transfer record'
  }
];

const aboutFlowSteps = [
  { icon: 'fas fa-pen-to-square', label: 'Register' },
  { icon: 'fas fa-file-arrow-up', label: 'Submit' },
  { icon: 'fas fa-comments', label: 'Review' },
  { icon: 'fas fa-box-archive', label: 'Archive' }
];

const aboutOutcomes = [
  {
    icon: 'fas fa-folder-tree',
    title: 'Centralized Records',
    description: 'Groups, documents, approvals, and repository entries.'
  },
  {
    icon: 'fas fa-route',
    title: 'Guided Progress',
    description: 'Track projects from registration to completion.'
  },
  {
    icon: 'fas fa-chart-line',
    title: 'Decision Visibility',
    description: 'Monitor submissions, reviews, and academic actions.'
  }
];

export default function HomePage() {
  return (
    <PublicLayout>
      <div className={styles.landingPage}>
        <LandingNavigation />

        <main className={styles.main}>
          <section id="home" className={styles.heroSection}>
            <div className={styles.container}>
              <div className={styles.heroGrid}>
                <LandingManagedHero />
              </div>
            </div>
            <div className={`${styles.container} ${styles.heroInfoCard}`} data-reveal="fade-up">
              <div className={styles.heroInfoIcon} aria-hidden="true">
                <i className="fas fa-building-columns" />
              </div>
              <div className={styles.heroInfoText}>
                <h2>For the entire academic community</h2>
                <p>
                  Built for IT, MET, TCM, ESM, and NAME programs with dashboards for students, adviser
                  and panel faculty, department chairs, research heads, partners or beneficiaries,
                  technology transfer staff, and read-only e-library users. Students can self-register,
                  while faculty and staff accounts are issued by the school.
                </p>
              </div>
            </div>
            <div className={`${styles.featureRow} mx-auto`}>
              <LandingManagedFeatureRow />
            </div>
          </section>

          <section id="modules" className={styles.modulesSection}>
            <div className={styles.container}>
              <div className={styles.moduleShowcaseHeader}>
                <div className={`${styles.sectionIntro} ${styles.moduleIntro}`} data-reveal="fade-up">
                  <span className={styles.sectionKicker}>System Modules</span>
                  <h2>
                    Everything a capstone needs, <span>in one place</span>
                  </h2>
                  <p>
                    Each module supports a stage of the research lifecycle and the people
                    responsible for it.
                  </p>
                </div>
              </div>

              <div className={styles.moduleGrid}>
                {modules.map(module => (
                  <article key={module.title} className={styles.moduleCard} data-reveal="fade-up">
                    <div className={styles.moduleCardHeader}>
                      <span className={styles.moduleIcon} aria-hidden="true">
                        <i className={module.icon} />
                      </span>
                      <span className={styles.moduleBadge}>{module.badge}</span>
                    </div>
                    <div className={styles.moduleCardBody}>
                      <span className={styles.moduleAudience}>{module.audience}</span>
                      <h3>{module.title}</h3>
                      <p>{module.description}</p>
                    </div>
                    <ul className={styles.moduleCapabilityList}>
                      {module.capabilities.map(capability => (
                        <li key={capability}>{capability}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="workflow" className={styles.workflowSection}>
            <div className={styles.container}>
              <div className={styles.workflowHeader}>
                <div className={`${styles.sectionIntro} ${styles.workflowIntro}`} data-reveal="fade-up">
                  <span className={styles.sectionKicker}>Workflow</span>
                  <h2>
                    From proposal to <span>technology transfer</span>
                  </h2>
                  <p>
                    A single connected process keeps ownership, deadlines, files, and decisions
                    visible at every step.
                  </p>
                </div>
              </div>

              <ol className={styles.workflowTimeline}>
                {workflowSteps.map((step, index) => (
                  <li key={step.title} className={styles.workflowStep} data-reveal="fade-up">
                    <div className={styles.workflowIconWrap}>
                      <span className={styles.workflowIcon} aria-hidden="true">
                        <i className={step.icon} />
                      </span>
                      <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className={styles.workflowStepBody}>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                      <span className={styles.workflowArtifact}>{step.artifact}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <HallOfExcellence />

          <section id="about" className={`${styles.homeAboutSection} ${styles.bgMesh} relative overflow-hidden py-16 sm:py-20`}>
            <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,58,143,0.06),transparent_70%)]" />
            <div className="pointer-events-none absolute right-0 top-1/4 h-[600px] w-[600px] bg-[radial-gradient(circle_at_center,rgba(246,190,0,0.05),transparent_60%)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[800px] bg-[radial-gradient(circle_at_center,rgba(65,139,255,0.06),transparent_60%)] blur-3xl" />

            <div className={`${styles.container} relative z-10`}>
              <div className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
                <article
                  className={`${styles.homeAboutSummaryCard} group relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-[0_20px_60px_rgba(15,43,89,0.05)] backdrop-blur-2xl transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_24px_54px_rgba(15,43,89,0.07)] sm:p-10`}
                  data-reveal="fade-right"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-blue-50/30" />
                  <div className="relative z-10">
                    <LandingManagedAboutSummary />
                  </div>
                </article>

                <div className="flex flex-col gap-6">
                  <aside
                    className={`${styles.homeAboutFlowCard} relative flex flex-col justify-center overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/90 to-[#f2f7ff]/90 p-5 shadow-[0_20px_60px_rgba(15,43,89,0.05)] backdrop-blur-2xl transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_24px_54px_rgba(15,43,89,0.07)] sm:p-10`}
                    aria-label="System workflow preview"
                    data-reveal="fade-left"
                  >
                    <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-[100px] bg-gradient-to-bl from-[#f6be00]/10 to-transparent" />
                    <div className="relative z-10">
                      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <span className={`${styles.homeAboutFlowKicker} flex items-center gap-2 text-[0.8rem] font-extrabold uppercase text-[#003a8f]`}>
                          <i className="fas fa-route text-[#f6be00]" aria-hidden="true" />
                          System Flow
                        </span>
                        <strong className={`${styles.homeAboutFlowBadge} self-start rounded-full border border-[#e2eaf5] bg-white px-3 py-1 text-[0.85rem] font-bold text-[#4b6380] shadow-sm sm:self-auto`}>
                          From idea to archived output
                        </strong>
                      </div>

                      <div className="relative px-2">
                        <div className={`${styles.homeAboutFlowRail} absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-[#e2eaf5] shadow-inner`}>
                          <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[#003a8f]/60 to-transparent" />
                        </div>
                        <ol className="relative m-0 flex list-none justify-between gap-2 p-0">
                          {aboutFlowSteps.map(step => (
                            <li key={step.label} className="group/item relative z-10 flex flex-col items-center gap-3">
                              <span className={`${styles.homeAboutFlowIcon} flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white bg-white text-lg text-[#003a8f] shadow-[0_8px_20px_rgba(15,43,89,0.08)] ring-1 ring-[#e2eaf5] transition-colors duration-200 group-hover/item:bg-[#003a8f] group-hover/item:text-white sm:h-14 sm:w-14 sm:text-xl`} aria-hidden="true">
                                <i className={step.icon} />
                              </span>
                              <strong className={`${styles.homeAboutFlowLabel} rounded-md bg-white/80 px-1 py-0.5 text-[0.6rem] font-black uppercase text-[#102033] backdrop-blur-sm sm:px-2 sm:text-[0.7rem] sm:tracking-wider`}>
                                {step.label}
                              </strong>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </aside>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {aboutOutcomes.map((outcome, index) => (
                      <article
                        key={outcome.title}
                        className={`${styles.homeAboutOutcomeCard} group relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/60 p-6 shadow-[0_12px_30px_rgba(15,43,89,0.03)] backdrop-blur-xl transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-white hover:shadow-[0_24px_54px_rgba(15,43,89,0.07)]`}
                        data-reveal="fade-up"
                        style={{ '--reveal-delay': `${index * 0.1}s` } as CSSProperties}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f0f5ff]/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <span className={`${styles.homeAboutOutcomeIcon} mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[0.8rem] border border-white bg-gradient-to-br from-white to-[#eaf3ff] text-[1.25rem] text-[#003a8f] shadow-[0_4px_15px_rgba(15,43,89,0.05)] ring-1 ring-[#dfeaf8]`} aria-hidden="true">
                            <i className={outcome.icon} />
                          </span>
                          <h3 className={`${styles.homeAboutOutcomeTitle} mb-2 text-[1.1rem] font-black text-[#14243a]`}>{outcome.title}</h3>
                          <p className={`${styles.homeAboutOutcomeText} text-[0.9rem] font-medium leading-[1.6] text-[#536982]`}>{outcome.description}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`${styles.homeAboutCtaShell} relative overflow-hidden rounded-[2rem] border border-[#e2eaf5] bg-white p-1.5 shadow-[0_20px_60px_rgba(15,43,89,0.08)]`}
                data-reveal="fade-up"
                style={{ '--reveal-delay': '0.3s' } as CSSProperties}
              >
                <div className={`${styles.homeAboutCtaBand} relative flex flex-col items-center justify-between gap-6 rounded-[1.6rem] bg-explore px-6 py-8 sm:px-12 xl:flex-row`}>
                  <div className="max-w-lg text-center xl:text-left">
                    <h3 className={`${styles.homeAboutCtaTitle} mb-2 text-xl font-black text-[#102033]`}>Ready to explore ThesisTrack?</h3>
                    <p className={`${styles.homeAboutCtaText} text-sm font-medium text-[#536982]`}>
                      Discover how our unified workflow transforms academic project management.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link
                      href="/about"
                      className="inline-flex min-h-[3.2rem] items-center justify-center gap-3 rounded-full border border-[#0d61cf]/20 bg-gradient-to-br from-[#0d61cf] via-[#003a8f] to-[#082a67] px-8 py-3 text-[0.95rem] font-black text-white shadow-[0_12px_25px_rgba(0,58,143,0.25)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(0,58,143,0.28)] active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                    >
                      <span>Explore the System</span>
                      <i className="fas fa-arrow-right" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/about#capstone-team"
                      className={`${styles.homeAboutSecondaryLink} inline-flex min-h-[3.2rem] items-center justify-center gap-3 rounded-full border border-[#f6be00]/40 bg-gradient-to-br from-[#ffe98b] to-[#f6be00] px-8 py-3 text-[0.95rem] font-black text-[#5b4200] shadow-[0_12px_25px_rgba(246,190,0,0.2)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(246,190,0,0.24)] active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current`}
                    >
                      <span>Meet the Devs</span>
                      <i className="fas fa-users" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
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
