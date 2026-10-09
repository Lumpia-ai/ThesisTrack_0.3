'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LibraryCardSection, LibraryModal, LibraryStatCard } from '@/components/library/library-primitives';
import { LibraryShell } from '@/components/library/library-shell';
import type { RepositoryViewStats } from '@/lib/repository/project-engagement';

type RepositoryComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

const ALL_DEPARTMENTS = 'All Departments';

const cardStyle = {
  background: 'white',
  borderRadius: '1.2rem',
  padding: '1.5rem',
  boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)',
  border: '1px solid #F1F5F9'
} as const;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || 'The request could not be completed.');
  }
  return payload as T;
}

// Library: how often each repository record is opened, split into guests and
// signed-in visitors by department, plus the librarian's comments per record.
export function LibraryEngagement() {
  const [stats, setStats] = useState<RepositoryViewStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const payload = await readJson<{ stats: RepositoryViewStats[] }>(
        await fetch('/api/repository/view-stats', { cache: 'no-store', credentials: 'same-origin' })
      );
      setStats(payload.stats);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load view statistics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const departments = useMemo(
    () => [...new Set(stats.map((entry) => entry.department).filter((value): value is string => Boolean(value)))].sort(),
    [stats]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return stats
      .filter((entry) => departmentFilter === ALL_DEPARTMENTS || entry.department === departmentFilter)
      .filter((entry) => !search || entry.title.toLowerCase().includes(search))
      .sort((left, right) => right.totalViews - left.totalViews);
  }, [stats, query, departmentFilter]);

  const totals = useMemo(() => {
    const byDepartment = new Map<string, number>();
    let guests = 0;
    let members = 0;
    let comments = 0;
    for (const entry of filtered) {
      guests += entry.guestViews;
      members += entry.memberViews;
      comments += entry.commentCount;
      for (const row of entry.byDepartment) {
        byDepartment.set(row.department, (byDepartment.get(row.department) ?? 0) + row.views);
      }
    }
    return {
      guests,
      members,
      comments,
      byDepartment: [...byDepartment.entries()].sort((left, right) => right[1] - left[1])
    };
  }, [filtered]);

  const selected = stats.find((entry) => entry.repositoryProjectId === selectedId) ?? null;
  const maxDepartmentViews = Math.max(1, totals.guests, ...totals.byDepartment.map(([, views]) => views));

  return (
    <LibraryShell
      activeNav="engagement"
      title="Views & Comments"
      description="How often each repository record is opened, by department and by guests"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
        <div className="library-stat-grid">
          <LibraryStatCard title="Total Views" value={(totals.guests + totals.members).toLocaleString()} />
          <LibraryStatCard title="Signed-in Views" value={totals.members.toLocaleString()}>
            <p>Students, faculty, and staff</p>
          </LibraryStatCard>
          <LibraryStatCard title="Guest Views" value={totals.guests.toLocaleString()}>
            <p>Visitors without an account</p>
          </LibraryStatCard>
          <LibraryStatCard title="Comments" value={totals.comments.toLocaleString()} />
        </div>

        <section style={cardStyle}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#003A8F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-eye" />
            </div>
            Views by Department
          </h3>
          {totals.byDepartment.length === 0 && totals.guests === 0 ? (
            <p style={{ margin: 0, color: '#64748B', fontWeight: 600 }}>No views recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...totals.byDepartment, ['Guests', totals.guests] as [string, number]].map(([label, views]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '110px', fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>{label}</div>
                  <div style={{ flex: 1, height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(views / maxDepartmentViews) * 100}%`,
                        height: '100%',
                        background: label === 'Guests' ? '#F6BE00' : 'linear-gradient(90deg, #003A8F, #3B82F6)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div style={{ width: '48px', textAlign: 'right', fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>{views}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <LibraryCardSection
          title="Repository Records"
          action={
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title..."
                aria-label="Search repository records"
                style={{ height: '36px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.875rem' }}
              />
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                aria-label="Department"
                style={{ height: '36px', padding: '0 0.5rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.875rem' }}
              >
                <option>{ALL_DEPARTMENTS}</option>
                {departments.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
            </div>
          }
        >
          {loadError ? (
            <p style={{ color: '#B91C1C', fontWeight: 600 }}>
              {loadError}{' '}
              <button className="library-btn is-outline is-small" type="button" onClick={() => void load()}>
                Retry
              </button>
            </p>
          ) : isLoading ? (
            <p style={{ color: '#64748B', fontWeight: 600 }}>Loading view statistics...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#64748B', fontWeight: 600 }}>No repository records match these filters.</p>
          ) : (
            <div className="library-table-wrap">
              <table className="library-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Department</th>
                    <th>Total</th>
                    <th>Signed-in</th>
                    <th>Guests</th>
                    <th>Comments</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.repositoryProjectId}>
                      <td>
                        <strong>{entry.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {[entry.schoolYear, entry.publishedAt ? `Published ${formatDate(entry.publishedAt)}` : null].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td>{entry.department || '—'}</td>
                      <td><strong>{entry.totalViews}</strong></td>
                      <td>{entry.memberViews}</td>
                      <td>{entry.guestViews}</td>
                      <td>{entry.commentCount}</td>
                      <td>
                        <button className="library-btn is-outline is-small" type="button" onClick={() => setSelectedId(entry.repositoryProjectId)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LibraryCardSection>
      </div>

      <LibraryModal
        open={Boolean(selected)}
        title={selected?.title ?? ''}
        onClose={() => setSelectedId(null)}
        maxWidth={760}
        footer={
          selected ? (
            <Link className="library-btn is-outline" href={`/repository/${selected.repositoryProjectId}`} target="_blank">
              Open repository page
            </Link>
          ) : null
        }
      >
        {selected ? <EngagementDetail stats={selected} onCommentsChanged={load} /> : null}
      </LibraryModal>
    </LibraryShell>
  );
}

function EngagementDetail({ stats, onCommentsChanged }: { stats: RepositoryViewStats; onCommentsChanged: () => void }) {
  const [comments, setComments] = useState<RepositoryComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const base = `/api/repository/projects/${encodeURIComponent(stats.repositoryProjectId)}/comments`;

  useEffect(() => {
    let cancelled = false;
    fetch(base, { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => readJson<{ comments: RepositoryComment[] }>(response))
      .then((payload) => !cancelled && setComments(payload.comments))
      .catch((loadError: Error) => !cancelled && setError(loadError.message));
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => !cancelled && setViewerId(payload?.user?.id ?? payload?.data?.user?.id ?? null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [base]);

  async function submit() {
    setIsSaving(true);
    setError(null);
    try {
      const payload = await readJson<{ comments: RepositoryComment[] }>(
        await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ body: draft })
        })
      );
      setComments(payload.comments);
      setDraft('');
      onCommentsChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the comment.');
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(commentId: string) {
    setError(null);
    try {
      const payload = await readJson<{ comments: RepositoryComment[] }>(
        await fetch(`${base}?commentId=${encodeURIComponent(commentId)}`, { method: 'DELETE', credentials: 'same-origin' })
      );
      setComments(payload.comments);
      onCommentsChanged();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove the comment.');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
        {[
          ['Total', stats.totalViews],
          ['Signed-in', stats.memberViews],
          ['Guests', stats.guestViews]
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#F8FAFC', borderRadius: '0.75rem', padding: '0.85rem 1rem', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>{value}</div>
          </div>
        ))}
      </div>

      <div>
        <h4 style={{ margin: '0 0 0.75rem 0', fontWeight: 800, color: '#0F172A' }}>Signed-in views by department</h4>
        {stats.byDepartment.length === 0 ? (
          <p style={{ margin: 0, color: '#64748B', fontWeight: 600 }}>No signed-in views yet.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {stats.byDepartment.map((row) => (
              <li key={row.department} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#334155' }}>
                <span>{row.department}</span>
                <strong>{row.views}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 style={{ margin: '0 0 0.75rem 0', fontWeight: 800, color: '#0F172A' }}>Comments</h4>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a comment about this record (e.g. missing files, cataloguing notes)..."
          maxLength={2000}
          style={{ width: '100%', minHeight: '90px', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', fontSize: '0.9rem', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="library-btn is-primary is-small" type="button" disabled={isSaving || !draft.trim()} onClick={() => void submit()}>
            {isSaving ? 'Saving...' : 'Post Comment'}
          </button>
        </div>
        {error ? <p style={{ color: '#B91C1C', fontWeight: 600 }}>{error}</p> : null}

        {comments === null ? (
          <p style={{ color: '#64748B', fontWeight: 600 }}>Loading comments...</p>
        ) : comments.length === 0 ? (
          <p style={{ color: '#64748B', fontWeight: 600 }}>No comments yet.</p>
        ) : (
          <ul style={{ margin: '1rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {comments.map((comment) => (
              <li key={comment.id} style={{ background: '#F8FAFC', borderRadius: '0.75rem', padding: '0.85rem 1rem', border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                  <span>
                    <strong style={{ color: '#0F172A' }}>{comment.authorName}</strong> · {formatDate(comment.createdAt)}
                  </span>
                  {comment.authorId === viewerId ? (
                    <button
                      type="button"
                      onClick={() => void remove(comment.id)}
                      style={{ border: 'none', background: 'transparent', color: '#B91C1C', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <p style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap', color: '#334155' }}>{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
