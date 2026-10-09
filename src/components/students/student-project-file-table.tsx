import { memo } from 'react';
import Link from 'next/link';
import { FileItem } from '@/components/students/student-project-file-item';
import type { PortalRole, ProjectFileRecord, ProjectFileSortOption } from '@/components/students/student-project-files.shared';
import {
  CAPSTONE_STAGE_OPTIONS,
  PROJECT_FILE_FILTER_OPTIONS,
  PROJECT_FILE_SORT_OPTIONS
} from '@/components/students/student-project-files.shared';

type FileTableProps = {
  files: ProjectFileRecord[];
  totalCount: number;
  currentUserRole: PortalRole;
  currentUserId: string;
  categoryFilter: string;
  searchTerm: string;
  sortBy: ProjectFileSortOption;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  errorMessage: string | null;
  onCategoryFilterChange: (value: string) => void;
  capstoneFilter: string;
  onCapstoneFilterChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onSortByChange: (value: ProjectFileSortOption) => void;
  onPageSizeChange: (value: number) => void;
  onPageChange: (value: number) => void;
  onView: (file: ProjectFileRecord) => void;
  onDownload: (file: ProjectFileRecord) => void;
  onDelete: (file: ProjectFileRecord) => void;
  onApprove: (file: ProjectFileRecord) => void;
  onViewHistory: (file: ProjectFileRecord) => void;
  onViewComments?: (file: ProjectFileRecord) => void;
};

export const FileTable = memo(function FileTable({
  files,
  totalCount,
  currentUserRole,
  currentUserId,
  categoryFilter,
  searchTerm,
  sortBy,
  pageSize,
  currentPage,
  totalPages,
  isLoading,
  errorMessage,
  onCategoryFilterChange,
  capstoneFilter,
  onCapstoneFilterChange,
  onSearchTermChange,
  onSortByChange,
  onPageSizeChange,
  onPageChange,
  onView,
  onDownload,
  onDelete,
  onApprove,
  onViewHistory,
  onViewComments
}: FileTableProps) {
  const itemStart = totalCount ? (currentPage - 1) * pageSize + 1 : 0;
  const itemEnd = totalCount ? Math.min(currentPage * pageSize, totalCount) : 0;
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filter + sort on one line (sort used to be hidden). */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search files</span>
          <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-meta)]" aria-hidden="true" />
          <input
            id="project-files-search"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search files..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
          />
        </label>
        {/* School-year filter, grouped by Capstone/Thesis term (only IT calls it Capstone). */}
        <select
          id="project-files-term"
          value={capstoneFilter}
          onChange={(event) => onCapstoneFilterChange(event.target.value)}
          aria-label="Filter by school year and stage"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--primary)]"
        >
          <option value="all">All School Years</option>
          {([
            { term: 1, label: 'Capstone/Thesis 1 · 3rd Year, 2nd Sem' },
            { term: 2, label: 'Capstone/Thesis 2 · 4th Year, 1st Sem' }
          ] as const).map((group) => (
            <optgroup key={group.term} label={group.label}>
              <option value={`c${group.term}`}>All of Capstone/Thesis {group.term}</option>
              {CAPSTONE_STAGE_OPTIONS[group.term].map((stage) => (
                <option key={stage.key} value={stage.key}>{stage.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          id="project-files-filter"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
          aria-label="Filter by category"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--primary)]"
        >
          {PROJECT_FILE_FILTER_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <select
          id="project-files-sort"
          value={sortBy}
          onChange={(event) => onSortByChange(event.target.value as ProjectFileSortOption)}
          aria-label="Sort files"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--primary)]"
        >
          {PROJECT_FILE_SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
      </div>

      {errorMessage ? (
        <div className="project-files-state is-danger">
          <i className="fas fa-circle-exclamation" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="project-files-skeleton-table" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="project-files-skeleton-row">
              <div className="project-files-skeleton-block is-title" />
              <div className="project-files-skeleton-block" />
              <div className="project-files-skeleton-block" />
              <div className="project-files-skeleton-block" />
            </div>
          ))}
        </div>
      ) : files.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[1040px] table-fixed text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)] text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">
                  {/* Fixed proportions so no column hogs the leftover width. */}
                  <th className="w-[31%] px-4 py-2.5">File</th>
                  <th className="w-[9%] px-4 py-2.5">Stage</th>
                  <th className="w-[19%] px-4 py-2.5">Status</th>
                  <th className="w-[13%] px-4 py-2.5">Reviewed</th>
                  <th className="w-[15%] px-4 py-2.5">Uploaded</th>
                  <th className="w-[8%] px-4 py-2.5 text-right">Size</th>
                  <th className="w-[5%] px-4 py-2.5 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    currentUserRole={currentUserRole}
                    currentUserId={currentUserId}
                    onView={onView}
                    onDownload={onDownload}
                    onDelete={onDelete}
                    onApprove={onApprove}
                    onViewHistory={onViewHistory}
                    onViewComments={onViewComments}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[var(--muted)]">
              <span>Showing {itemStart} to {itemEnd} of {totalCount} file{totalCount === 1 ? '' : 's'}</span>
            </div>

            <div className="flex items-center gap-1">
              <button className="rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                Previous
              </button>

              <div className="flex items-center gap-1" aria-label="Pagination">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`h-7 min-w-7 rounded-lg px-2 text-xs font-bold transition ${pageNumber === currentPage ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-alt)]'}`}
                    type="button"
                    onClick={() => onPageChange(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <button className="rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state project-files-empty-state">
          <span className="empty-state-icon"><i className="fas fa-file-shield" aria-hidden="true" /></span>
          <strong>No private project files yet</strong>
          <p>Submit your first thesis or capstone document to begin secure tracking, adviser review, and version history.</p>
          <Link className="btn btn-primary project-files-empty-action" href="/students/submit">
            <i className="fas fa-file-arrow-up" aria-hidden="true" /> Submit Documents
          </Link>
        </div>
      )}
    </div>
  );
});
