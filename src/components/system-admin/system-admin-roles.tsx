'use client';

import { type CSSProperties, useEffect, useState } from 'react';
import { SystemAdminShell } from '@/components/system-admin/system-admin-shell';
import { ActionLink, AdminPage, IconTile, type IconTone } from '@/components/system-admin/ui';
import styles from './system-admin-roles.module.css';

/*
 * Reference guide to what each role can do. Access itself is enforced by each portal and API route;
 * this page documents it. Account counts come from GET /api/users (hidden if that request fails).
 */

type RoleKey =
  | 'system_admin'
  | 'research_head'
  | 'program_head'
  | 'adviser'
  | 'panel'
  | 'library'
  | 'partner'
  | 'tech_transfer'
  | 'student'
  | 'focal_person';

type RoleInfo = {
  key: RoleKey;
  label: string;
  level: string;
  icon: string;
  tone: IconTone;
  summary: string;
  can: string[];
  cannot: string[];
  /** A workflow rather than a group of people: no account count is shown. */
  workflow?: boolean;
};

// Display order for both the cards and the matrix columns.
const ROLES: RoleInfo[] = [
  {
    key: 'system_admin',
    label: 'System Administrator',
    level: 'Technical control',
    icon: 'fa-server',
    tone: 'primary',
    summary: 'Runs the platform: accounts, roles, settings, branding, backups, and maintenance.',
    can: ['Create staff accounts and assign roles', 'Suspend and restore any account', 'Change system settings and branding', 'Run backups, view logs, and toggle maintenance'],
    cannot: ['Own research monitoring or approval workflows']
  },
  {
    key: 'library',
    label: 'Library Personnel',
    level: 'Repository',
    icon: 'fa-book-open-reader',
    tone: 'primary',
    summary: 'Validates and archives finished research.',
    can: ['View approved research', 'Validate and manage the repository'],
    cannot: ['See ongoing student drafts', 'Change system settings']
  },
  {
    key: 'tech_transfer',
    label: 'Tech Transfer',
    level: 'Workflow',
    icon: 'fa-arrow-up-right-dots',
    tone: 'accent',
    summary: 'The intellectual property and technology transfer workflow.',
    can: ['Process IP and technology transfer requests'],
    cannot: ['Change system settings'],
    workflow: true
  },
  {
    key: 'research_head',
    label: 'Research Head',
    level: 'Research oversight',
    icon: 'fa-building-columns',
    tone: 'accent',
    summary: 'Oversees research across all programs.',
    can: ['Monitor users and projects across programs', 'Run approval pipelines', 'View system-wide reports', 'Release final work to the repository'],
    cannot: ['Change technical settings', 'Create Program Head or Adviser accounts']
  },
  {
    key: 'focal_person',
    label: 'Research Focal Person',
    level: 'Department research',
    icon: 'fa-user-check',
    tone: 'accent',
    summary: "Coordinates research in one department and endorses its work to the Research Head.",
    can: [
      'Monitor research projects in their department',
      'Review and endorse title proposals to the Research Head',
      'View department research reports',
      'Coordinate defense schedules'
    ],
    cannot: ['Give final approval (the Research Head does)', 'Change system settings or create accounts', "See other departments' projects"]
  },
  {
    key: 'program_head',
    label: 'Program Head',
    level: 'Department',
    icon: 'fa-user-tie',
    tone: 'primary',
    summary: "Manages one department's advisers and academic progress.",
    can: ["Monitor their department's projects", 'Create adviser accounts', 'Assign panelists'],
    cannot: ['Change system settings', 'Access other departments']
  },
  {
    key: 'panel',
    label: 'Panelist',
    level: 'Academic',
    icon: 'fa-clipboard-check',
    tone: 'success',
    summary: 'Reviews and evaluates defenses.',
    can: ['Review defense materials', 'Submit defense evaluations'],
    cannot: ['Access anything outside the evaluation workflow']
  },
  {
    key: 'adviser',
    label: 'Adviser',
    level: 'Academic',
    icon: 'fa-chalkboard-user',
    tone: 'success',
    summary: 'Supervises assigned groups and reviews their submissions.',
    can: ['Guide assigned groups', 'Review submissions and give document feedback', 'Evaluate defenses'],
    cannot: ['Configure the system', 'See students outside their assigned groups']
  },
  {
    key: 'student',
    label: 'Student',
    level: 'Self-registered',
    icon: 'fa-user-graduate',
    tone: 'primary',
    summary: 'Works on their group project from proposal to defense.',
    can: ['Register their own account', 'Submit project proposals', 'Upload workflow files', 'Track defense progress'],
    cannot: ['Access any admin tools', "See other groups' work"]
  },
  {
    key: 'partner',
    label: 'Industry Partner',
    level: 'External',
    icon: 'fa-handshake',
    tone: 'accent',
    summary: 'Collaborates with the institution on approved research.',
    can: ['View approved research', 'Partner matching and feedback', 'Track deployment status'],
    cannot: ['See ongoing student drafts', 'Change system settings']
  }
];

type Access = 'full' | 'scoped' | 'view';

/** Capability areas × roles. Roles not listed for an area have no access to it. */
const MATRIX: { area: string; icon: string; access: Partial<Record<RoleKey, { level: Access; note: string }>> }[] = [
  {
    area: 'Accounts & roles',
    icon: 'fa-users-gear',
    access: {
      system_admin: { level: 'full', note: 'Create staff accounts, assign roles, suspend and restore' },
      research_head: { level: 'view', note: 'Monitor users across programs' },
      program_head: { level: 'scoped', note: 'Adviser accounts in their department' },
      student: { level: 'scoped', note: 'Their own account (self-registration)' }
    }
  },
  {
    area: 'System settings & branding',
    icon: 'fa-sliders',
    access: { system_admin: { level: 'full', note: 'All settings and branding' } }
  },
  {
    area: 'Backups, logs & maintenance',
    icon: 'fa-database',
    access: { system_admin: { level: 'full', note: 'Backups, logs, and maintenance mode' } }
  },
  {
    area: 'Project monitoring & approvals',
    icon: 'fa-diagram-project',
    access: {
      research_head: { level: 'full', note: 'All programs and approval pipelines' },
      focal_person: { level: 'scoped', note: 'Monitor their department; endorse title proposals to the Research Head' },
      program_head: { level: 'scoped', note: 'Their department' },
      adviser: { level: 'scoped', note: 'Assigned groups' }
    }
  },
  {
    area: 'Reports',
    icon: 'fa-chart-column',
    access: {
      research_head: { level: 'full', note: 'System-wide reports' },
      focal_person: { level: 'scoped', note: 'Department research reports' }
    }
  },
  {
    area: 'Submissions & feedback',
    icon: 'fa-file-arrow-up',
    access: {
      adviser: { level: 'scoped', note: 'Review and give feedback to assigned groups' },
      student: { level: 'scoped', note: "Submit their own group's work" }
    }
  },
  {
    area: 'Defense evaluation',
    icon: 'fa-clipboard-check',
    access: {
      focal_person: { level: 'scoped', note: 'Coordinate defense schedules in their department' },
      program_head: { level: 'scoped', note: 'Assign panelists' },
      adviser: { level: 'full', note: 'Evaluate defenses' },
      panel: { level: 'full', note: 'Review and evaluate defenses' },
      student: { level: 'view', note: 'Track their defense progress' }
    }
  },
  {
    area: 'Research repository',
    icon: 'fa-book-open-reader',
    access: {
      research_head: { level: 'scoped', note: 'Final release to the repository' },
      library: { level: 'full', note: 'Validate and manage the repository' },
      partner: { level: 'view', note: 'Approved research only' }
    }
  },
  {
    area: 'Tech transfer & IP',
    icon: 'fa-arrow-up-right-dots',
    access: {
      tech_transfer: { level: 'full', note: 'Process IP and transfer requests' },
      partner: { level: 'scoped', note: 'Matching, feedback, and deployment status' }
    }
  }
];

// Icon-only badges; each has a distinct symbol (not just color), and the legend names them.
const ACCESS_META: Record<Access, { icon: string; label: string; className: string }> = {
  full: { icon: 'fa-check', label: 'Full access', className: styles.accessFull },
  scoped: { icon: 'fa-circle-half-stroke', label: 'Limited to their scope', className: styles.accessScoped },
  view: { icon: 'fa-eye', label: 'View only', className: styles.accessView }
};

function AccessBadge({ level }: { level: Access }) {
  const meta = ACCESS_META[level];

  return (
    <span className={`${styles.badge} ${meta.className}`} aria-hidden="true">
      <i className={`fas ${meta.icon}`} />
    </span>
  );
}

const TONE_CLASS: Record<IconTone, string> = {
  primary: styles.tonePrimary,
  accent: styles.toneAccent,
  success: styles.toneSuccess,
  error: styles.toneError
};

const MATRIX_ROLES = ROLES;

type View = 'cards' | 'matrix';

/** Account count per role from the user directory; null while loading or if the request fails. */
function useRoleCounts() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/users', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { users?: { role: string }[] } | null) => {
        if (cancelled || !payload?.users) {
          return;
        }

        const next: Record<string, number> = {};
        for (const user of payload.users) {
          next[user.role] = (next[user.role] ?? 0) + 1;
        }
        setCounts(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}

function CheckList({ items, kind }: { items: string[]; kind: 'can' | 'cannot' }) {
  return (
    <ul className={styles.checkList}>
      {items.map((item) => (
        <li key={item}>
          <i
            className={`fas ${kind === 'can' ? 'fa-check' : 'fa-xmark'} ${kind === 'can' ? styles.iconCan : styles.iconCannot}`}
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function SystemAdminRoles() {
  const [view, setView] = useState<View>('cards');
  const counts = useRoleCounts();
  const totalAccounts = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : null;
  const definedRoles = ROLES.filter((role) => role.can.length || role.cannot.length).length;

  return (
    <SystemAdminShell
      activeNav="roles"
      title="Roles and Permissions"
      description="What each role can and can't do."
    >
      <AdminPage wide>
        <div className={styles.toolbar}>
          <div className={styles.heroCopy}>
            <span className={styles.heroKicker}>
              <i className="fas fa-shield-halved" aria-hidden="true" />
              Access control
            </span>
            <p className={styles.intro}>
              What each role can and can&apos;t do. Staff accounts are created in User Management; students register themselves.
            </p>
          </div>

          <dl className={styles.heroStats}>
            <div>
              <dt>Roles</dt>
              <dd>{ROLES.length}</dd>
            </div>
            <div>
              <dt>Configured</dt>
              <dd>{definedRoles}/{ROLES.length}</dd>
            </div>
            <div>
              <dt>Accounts</dt>
              <dd>{totalAccounts ?? '–'}</dd>
            </div>
          </dl>

          <div className={styles.heroActions}>
          <div className={styles.segmented} role="group" aria-label="View">
            {(
              [
                { key: 'cards', label: 'Role cards', icon: 'fa-grip' },
                { key: 'matrix', label: 'Permission matrix', icon: 'fa-table-cells' }
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={view === option.key}
                className={`${styles.segment} ${view === option.key ? styles.segmentActive : ''}`}
                onClick={() => setView(option.key)}
              >
                <i className={`fas ${option.icon}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
          <ActionLink href="/system-admin/users" icon="fa-users-gear">
            Manage accounts
          </ActionLink>
          </div>
        </div>

        {view === 'cards' ? (
          <section className={styles.cardGrid} aria-label="Roles">
            {ROLES.map((role, index) => {
              const count = counts?.[role.key];
              const undefinedRole = !role.can.length && !role.cannot.length;

              return (
                <article
                  key={role.key}
                  className={`${styles.card} ${TONE_CLASS[role.tone]} ${undefinedRole ? styles.cardPending : ''}`}
                  style={{ '--i': index } as CSSProperties}
                >
                  <header className={styles.cardHead}>
                    <IconTile icon={role.icon} tone={role.tone} />
                    <div className={styles.cardTitle}>
                      <h2 className={styles.roleName}>{role.label}</h2>
                      <div className={styles.level}>{role.level}</div>
                    </div>
                    {counts && !role.workflow ? (
                      <div className={styles.count} title="Accounts with this role">
                        <i className="fas fa-user" aria-hidden="true" />
                        {count ?? 0}
                        <span className={styles.srOnly}>{count === 1 ? ' account' : ' accounts'}</span>
                      </div>
                    ) : null}
                  </header>

                  <p className={styles.summary}>{role.summary}</p>

                  {undefinedRole ? (
                    <div className={styles.pendingNote}>
                      <i className="fas fa-hourglass-half" aria-hidden="true" />
                      Permissions not defined yet
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className={styles.listTitle}>Can</div>
                        <CheckList items={role.can} kind="can" />
                      </div>
                      <div className={styles.cannot}>
                        <div className={styles.listTitle}>Cannot</div>
                        <CheckList items={role.cannot} kind="cannot" />
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section className={styles.matrixCard} aria-label="Permission matrix">
            <div className={styles.legend}>
              {(Object.keys(ACCESS_META) as Access[]).map((level) => (
                <div key={level} className={styles.legendItem}>
                  <AccessBadge level={level} />
                  {ACCESS_META[level].label}
                </div>
              ))}
              <div className={styles.legendItem}>
                <span className={styles.none} aria-hidden="true" />
                No access
              </div>
              <div className={styles.legendHint}>Hover a mark for details.</div>
            </div>

            <div className={styles.matrixScroll}>
              <table className={styles.matrix}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.areaHead}>
                      Capability
                    </th>
                    {MATRIX_ROLES.map((role) => (
                      <th key={role.key} scope="col" className={styles.roleHead}>
                        <IconTile icon={role.icon} tone={role.tone} />
                        <span className={styles.roleLabel}>{role.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.area}>
                      <th scope="row" className={styles.areaCell}>
                        <i className={`fas ${row.icon}`} aria-hidden="true" />
                        {row.area}
                      </th>
                      {MATRIX_ROLES.map((role) => {
                        const entry = row.access[role.key];

                        if (!entry) {
                          return (
                            <td key={role.key} className={styles.cell}>
                              <span className={styles.none} aria-hidden="true" />
                              <span className={styles.srOnly}>No access</span>
                            </td>
                          );
                        }

                        const meta = ACCESS_META[entry.level];

                        return (
                          <td key={role.key} className={styles.cell} title={`${meta.label}: ${entry.note}`}>
                            <AccessBadge level={entry.level} />
                            <span className={styles.srOnly}>
                              {meta.label}: {entry.note}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.footnote}>
              Research Focal Person isn&apos;t shown: the role exists in the database, but its permissions haven&apos;t been defined in the app yet.
            </p>
          </section>
        )}
      </AdminPage>
    </SystemAdminShell>
  );
}
