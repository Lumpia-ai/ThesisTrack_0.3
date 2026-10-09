'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { checkTitleAgainstRepository, getTooSimilarMessage, REPOSITORY_SIMILARITY_LIMIT } from '@/lib/repository-title-check';

// Live "Repository matches" list for a title field. Updates as the student
// types (short pause, no Search button) and shows whether the title may proceed
// under the 20% rule. Compares only against the system Repository (mock data).
export function RepositoryTitleCheckPanel({ title, label }: { title: string; label: string }) {
  const [debouncedTitle, setDebouncedTitle] = useState(title);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTitle(title), 250);
    return () => window.clearTimeout(timer);
  }, [title]);

  const check = useMemo(() => checkTitleAgainstRepository(debouncedTitle), [debouncedTitle]);

  if (!debouncedTitle.trim() || !check.hasEnoughWords) {
    return null;
  }

  return (
    <div className={`mt-3 rounded-xl border p-3 ${check.allowed ? 'border-[var(--border)] bg-[var(--surface-alt)]' : 'border-rose-200 bg-rose-50/60'}`} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Repository matches</span>
        {check.allowed ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <i className="fas fa-circle-check" aria-hidden="true" />
            Allowed to proceed · highest {check.highest}%
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
            <i className="fas fa-ban" aria-hidden="true" />
            Too similar · {check.highest}%
          </span>
        )}
      </div>

      {!check.allowed ? (
        <p className="mt-2 text-xs font-semibold leading-relaxed text-rose-800">{getTooSimilarMessage(label, check.highest)}</p>
      ) : null}

      {check.matches.length ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {check.matches.map((match) => {
            const isOver = match.similarity > REPOSITORY_SIMILARITY_LIMIT;

            return (
              <li key={match.projectId} className="flex items-start gap-3 rounded-lg bg-[var(--surface)] px-3 py-2">
                <span className={`w-14 shrink-0 pt-0.5 text-right text-xs font-black ${isOver ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {match.similarity}%
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[var(--text)]">{match.title}</span>
                  <span className="block truncate text-[11px] text-[var(--muted)]">
                    {match.authors} · {match.department} · {match.type} · {match.schoolYear}
                  </span>
                </span>
                <Link
                  prefetch={false}
                  href={`/students/repository?study=${match.projectId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                >
                  View
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[var(--muted)]">No similar studies found in the repository.</p>
      )}

      <p className="mt-2 text-[10px] text-[var(--text-meta)]">
        Compared only against studies in the system Repository, using a simple title-word comparison (prototype). Titles above {REPOSITORY_SIMILARITY_LIMIT}% cannot be submitted.
      </p>
    </div>
  );
}
