'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PH_CARD_CLASS,
  PH_ROW_HEIGHT_CLASS,
  PH_TD_CLASS,
  PH_TH_CLASS,
  ProgramHeadAnimatedNumber,
  ProgramHeadButton,
  ProgramHeadFillerRows,
  ProgramHeadFilterSelect,
  ProgramHeadMeter,
  ProgramHeadModal,
  ProgramHeadPageHeader,
  ProgramHeadPaginationBar,
  ProgramHeadPrimaryAction,
  ProgramHeadSearchInput,
  ProgramHeadStatCard,
  ProgramHeadTabs,
  useProgramHeadPagination
} from '@/components/program-head/program-head-primitives';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';
import { SAMPLE_EVIDENCE_GROUPS, getSampleEvidenceFiles } from '@/components/program-head/program-head-evidence-sample';

/** Remembers the "Sample data" switch; defaults to on in development, off in production. */
const SAMPLE_TOGGLE_STORAGE_KEY = 'thesistrack-program-head-evidence-sample-data';

/*
 * Accreditation evidence is not uploaded here. It is everything students and
 * advisers already submit through Document Submissions, grouped into
 * accreditation areas. Only approved files (or achievement logs, which have no
 * review step) count as accreditation-ready.
 */
const EVIDENCE_AREAS = [
  { key: 'research', label: 'Research Outputs', icon: 'fa-book', categories: ['final-manuscript'] },
  { key: 'defense', label: 'Defense Records', icon: 'fa-gavel', categories: ['concept-defense-application', 'proposal-defense-application', 'final-defense-application'] },
  { key: 'awards', label: 'Awards & Activities', icon: 'fa-award', categories: ['award-recognition', 'activity-evidence'] },
  { key: 'systems', label: 'Systems & Testing', icon: 'fa-laptop-code', categories: ['system-files', 'testing-evidence', 'development-testing-evidence'] },
  { key: 'presentations', label: 'Presentations & Supporting', icon: 'fa-person-chalkboard', categories: ['presentation-files', 'supporting-documents'] }
] as const;

type AreaKey = (typeof EVIDENCE_AREAS)[number]['key'];

const CATEGORY_LABELS: Record<string, string> = {
  'final-manuscript': 'Final Manuscript',
  'concept-defense-application': 'Defense Application (Concept)',
  'proposal-defense-application': 'Defense Application (Proposal)',
  'final-defense-application': 'Defense Application (Final)',
  'award-recognition': 'Award / Recognition',
  'activity-evidence': 'Activity Evidence',
  'system-files': 'System Files',
  'testing-evidence': 'Testing Evidence',
  'development-testing-evidence': 'Testing Evidence',
  'presentation-files': 'Presentation',
  'supporting-documents': 'Supporting Document'
};

const CATEGORY_ICONS: Record<string, string> = {
  'Final Manuscript': 'fa-book',
  'Defense Application (Concept)': 'fa-gavel',
  'Defense Application (Proposal)': 'fa-gavel',
  'Defense Application (Final)': 'fa-gavel',
  'Award / Recognition': 'fa-award',
  'Activity Evidence': 'fa-camera',
  'System Files': 'fa-laptop-code',
  'Testing Evidence': 'fa-vial',
  Presentation: 'fa-person-chalkboard',
  'Supporting Document': 'fa-paperclip'
};

// Evidence types in the order they appear inside a group (follows the area order).
const CATEGORY_ORDER = Array.from(new Set(
  EVIDENCE_AREAS.flatMap((area) => area.categories.map((category) => CATEGORY_LABELS[category]))
));

/*
 * Evidence every group must eventually have, in the order the thesis produces it.
 * A required type is only flagged "Missing" once the group has uploaded something
 * that comes after it; before that it is simply "Upcoming", so a group still at
 * concept stage is not reported as missing its final manuscript.
 */
const REQUIRED_SEQUENCE = [
  'Defense Application (Concept)',
  'Defense Application (Proposal)',
  'Testing Evidence',
  'Defense Application (Final)',
  'Final Manuscript'
];

// Achievement logs have no adviser review step, so they are ready as soon as they exist.
const NO_REVIEW_CATEGORIES = new Set(['award-recognition', 'activity-evidence']);

const AREA_BY_CATEGORY = new Map<string, AreaKey>(
  EVIDENCE_AREAS.flatMap((area) => area.categories.map((category) => [category, area.key] as const))
);

type EvidenceStatus = 'ready' | 'in-review' | 'revision' | 'uploaded';

const STATUS_META: Record<EvidenceStatus, { label: string; dot: string; text: string }> = {
  // Shared portal palette (tokens on .ph-portal-shell): navy = ready, light blue = in progress,
  // gold = needs attention, neutral = not started. Text colours are darkened for contrast.
  ready: { label: 'Accreditation-ready', dot: 'bg-[var(--ph-c-navy)]', text: 'text-[var(--ph-brand-text)]' },
  'in-review': { label: 'In review', dot: 'bg-[var(--ph-c-light)]', text: 'text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))]' },
  revision: { label: 'Needs revision', dot: 'bg-[var(--ph-c-gold)]', text: 'text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))]' },
  uploaded: { label: 'Not submitted for review', dot: 'bg-[var(--ph-c-neutral)]', text: 'text-[var(--muted)]' }
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'ready', label: 'Accreditation-ready' },
  { value: 'in-review', label: 'In review' },
  { value: 'revision', label: 'Needs revision' },
  { value: 'uploaded', label: 'Not submitted' },
  { value: 'duplicate', label: 'Possible duplicates' }
];

const DECISION_LABELS: Record<string, { label: string; className: string }> = {
  APPROVE: { label: 'Approved', className: 'text-[var(--ph-brand-text)]' },
  REQUEST_CHANGES: { label: 'Changes requested', className: 'text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))]' },
  REJECT: { label: 'Rejected', className: 'text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))]' },
  COMMENT: { label: 'Comment', className: 'text-[var(--muted)]' }
};

const VIEW_STORAGE_KEY = 'program-head-evidence-view';
const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

export type ApiReviewComment = { id: string; body: string | null; decision: string | null; createdAt: string; authorName: string | null };
export type ApiGroupMember = { name: string; role: string; isLeader: boolean };

export type ApiDocumentFile = {
  id: string;
  fileName: string;
  filePath: string | null;
  fileType: string;
  fileSize: number | null;
  uploadedByName: string | null;
  projectId: string | null;
  projectTitle: string | null;
  groupCode: string | null;
  groupTitle: string | null;
  groupMembers: ApiGroupMember[] | null;
  milestone: string | null;
  submissionStatus: string | null;
  submissionVersion: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComments: ApiReviewComment[] | null;
  documentCategory: string;
  createdAt: string;
  /** Sample data only (see program-head-evidence-sample.ts): drawn page image, never fetched from the API. */
  sampleUrl?: string;
  isSample?: boolean;
};

type EvidenceItem = ApiDocumentFile & {
  area: AreaKey;
  categoryLabel: string;
  status: EvidenceStatus;
  kind: 'image' | 'pdf' | 'other';
  available: boolean;
  duplicate: boolean;
};

export type GroupRow = {
  projectId: string | null;
  code: string | null;
  title: string | null;
  projectTitle: string | null;
  progress?: number | null;
  progressStage?: string | null;
  currentMilestone?: string | null;
};

type SlotState = 'present' | 'missing' | 'upcoming' | 'optional';

type TypeSlot = {
  label: string;
  required: boolean;
  state: SlotState;
  files: EvidenceItem[]; // after filters
  total: number; // before filters
  latest: string | null;
};

type EvidenceGroup = {
  key: string;
  projectId: string | null;
  code: string;
  title: string;
  members: ApiGroupMember[];
  stage: string | null;
  progress: number | null;
  allFiles: EvidenceItem[];
  files: EvidenceItem[]; // after filters, in type order
  slots: TypeSlot[];
  ready: number;
  missingRequired: number;
  duplicates: number;
  lastUpload: string | null;
};

const groupKeyOf = (file: { projectId: string | null; groupCode: string | null }) => file.projectId || file.groupCode || 'unassigned';

function getStatus(file: ApiDocumentFile): EvidenceStatus {
  if (NO_REVIEW_CATEGORIES.has(file.documentCategory)) return 'ready';
  switch ((file.submissionStatus || '').toUpperCase()) {
    case 'APPROVED': return 'ready';
    case 'SUBMITTED':
    case 'UNDER_REVIEW': return 'in-review';
    case 'NEEDS_REVISION':
    case 'REJECTED': return 'revision';
    default: return 'uploaded';
  }
}

function getKind(file: ApiDocumentFile): EvidenceItem['kind'] {
  const type = (file.fileType || '').toLowerCase();
  const extension = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) return 'image';
  if (type.includes('pdf') || extension === 'pdf') return 'pdf';
  return 'other';
}

/**
 * Loads the department's evidence files and classifies them. Shared with the
 * dashboard's Evidence gauge so both use the same "accreditation-ready" rules.
 */
export async function loadEvidenceItems(): Promise<EvidenceItem[]> {
  const files: ApiDocumentFile[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(`/api/document-files?page=${page}&limit=${PAGE_LIMIT}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load evidence files.');
    const payload = await response.json();
    const batch: ApiDocumentFile[] = payload.files || [];
    files.push(...batch);
    if (batch.length < PAGE_LIMIT) break;
  }
  return toEvidenceItems(files);
}

export function toEvidenceItems(files: ApiDocumentFile[]): EvidenceItem[] {
  const items = files.flatMap((file) => {
    const area = AREA_BY_CATEGORY.get(file.documentCategory);
    if (!area) return [];
    return [{
      ...file,
      area,
      categoryLabel: CATEGORY_LABELS[file.documentCategory] ?? file.documentCategory,
      status: getStatus(file),
      kind: getKind(file),
      available: Boolean(file.filePath),
      duplicate: false
    }];
  });

  // Same file name uploaded more than once for the same group and evidence type.
  const seen = new Map<string, number>();
  items.forEach((item) => {
    const key = `${groupKeyOf(item)}|${item.categoryLabel}|${item.fileName.trim().toLowerCase()}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });
  return items.map((item) => ({
    ...item,
    duplicate: (seen.get(`${groupKeyOf(item)}|${item.categoryLabel}|${item.fileName.trim().toLowerCase()}`) ?? 0) > 1
  }));
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const formatSize = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const latestDate = (files: EvidenceItem[]) => files.reduce<string | null>((latest, file) => (!latest || file.createdAt > latest ? file.createdAt : latest), null);
const previewUrl = (id: string) => `/api/document-files/${id}/preview`;
const downloadUrl = (id: string) => `/api/document-files/${id}/download`;
/** Image source for a file: sample files use their drawn page and never hit the file API. */
const imageSrc = (item: { id: string; sampleUrl?: string }) => item.sampleUrl ?? previewUrl(item.id);

/** Shown as an image: real image uploads, and sample files (scans and PDFs) that have a drawn page. */
const hasImage = (item: EvidenceItem) => item.available && (item.kind === 'image' || Boolean(item.sampleUrl));

function FileGlyph({ kind, className = '' }: { kind: EvidenceItem['kind']; className?: string }) {
  const meta = kind === 'pdf'
    ? { icon: 'fa-file-pdf', tone: 'text-rose-500 bg-rose-500/10' }
    : kind === 'image'
      ? { icon: 'fa-file-image', tone: 'text-[var(--ph-c-light)] bg-[color-mix(in_srgb,var(--ph-c-light)_16%,transparent)]' }
      : { icon: 'fa-file-lines', tone: 'text-[var(--ph-brand-text)] bg-[color-mix(in_srgb,var(--ph-c-navy)_10%,transparent)]' };
  return (
    <span className={`flex items-center justify-center ${meta.tone} ${className}`}>
      <i className={`fas ${meta.icon}`}></i>
    </span>
  );
}

function Thumbnail({ item, className, iconClassName }: { item: EvidenceItem; className: string; iconClassName: string }) {
  const [failed, setFailed] = useState(false);
  if (hasImage(item) && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- authenticated API stream, not a static asset
      <img src={imageSrc(item)} alt={item.fileName} loading="lazy" onError={() => setFailed(true)} className={`${className} object-cover object-top`} />
    );
  }
  return <FileGlyph kind={item.kind} className={`${className} ${iconClassName}`} />;
}

/** Up to four thumbnails arranged as a cover; falls back to an icon. */
function CoverMosaic({ files, fallbackIcon, badge }: { files: EvidenceItem[]; fallbackIcon: string; badge?: ReactNode }) {
  const covers = files.filter(hasImage).slice(0, 4);
  const shown = covers.length ? covers : files.slice(0, 1);
  return (
    <div className={`relative aspect-[16/9] bg-[var(--surface-alt)] grid gap-0.5 ${
      shown.length >= 3 ? 'grid-cols-2 grid-rows-2' : shown.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
    }`}>
      {shown.length === 0 ? (
        <span className="flex items-center justify-center text-4xl text-[color-mix(in_srgb,var(--ph-c-navy)_30%,transparent)]"><i className={`fas ${fallbackIcon}`}></i></span>
      ) : shown.map((cover, index) => (
        <div key={cover.id} className={`relative overflow-hidden ${shown.length === 3 && index === 0 ? 'row-span-2' : ''}`}>
          <Thumbnail item={cover} className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out" iconClassName="text-2xl" />
        </div>
      ))}
      {badge}
    </div>
  );
}

function StatusLabel({ status }: { status: EvidenceStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>{meta.label}
    </span>
  );
}

/** Small segmented status breakdown: ready / in review / revision / not submitted. */
function StatusBreakdown({ files }: { files: EvidenceItem[] }) {
  const parts = (Object.keys(STATUS_META) as EvidenceStatus[])
    .map((status) => ({ status, count: files.filter((file) => file.status === status).length }))
    .filter((part) => part.count);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {parts.map((part) => (
        <span key={part.status} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]" title={STATUS_META[part.status].label}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[part.status].dot}`}></span>
          {part.count} {part.status === 'ready' ? 'ready' : part.status === 'in-review' ? 'in review' : part.status === 'revision' ? 'revision' : 'not submitted'}
        </span>
      ))}
    </div>
  );
}

function Breadcrumb({ trail }: { trail: Array<{ label: ReactNode; onClick?: () => void }> }) {
  return (
    <nav aria-label="Evidence location" className="flex items-center flex-wrap gap-1.5 text-sm min-w-0">
      {trail.map((crumb, index) => (
        <span key={index} className="flex items-center gap-1.5 min-w-0">
          {index > 0 && <i className="fas fa-chevron-right text-[9px] text-[var(--muted)]"></i>}
          {crumb.onClick ? (
            <button type="button" onClick={crumb.onClick} className="font-semibold text-[var(--muted)] hover:text-[var(--ph-brand-text)] transition-colors whitespace-nowrap">{crumb.label}</button>
          ) : (
            <span className="font-bold text-[var(--text)] truncate">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function readStoredView(): 'grid' | 'list' {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export function ProgramHeadEvidence() {
  const [reportOpen, setReportOpen] = useState(false);
  const [section, setSection] = useState<'Evidence' | 'Coverage'>('Evidence');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [openType, setOpenType] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const [realItems, setItems] = useState<EvidenceItem[]>([]);
  const [realGroupRows, setGroupRows] = useState<GroupRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /*
   * Sample data: merged in when the switch is on. Sample files are flagged `isSample`,
   * use inline placeholder images, and are never previewed/downloaded through the API.
   */
  const [showSample, setShowSample] = useState(false);
  const sampleItems = useMemo(() => toEvidenceItems(getSampleEvidenceFiles()), []);

  useEffect(() => {
    const fallback = process.env.NODE_ENV !== 'production';
    try {
      const stored = window.localStorage.getItem(SAMPLE_TOGGLE_STORAGE_KEY);
      setShowSample(stored === null ? fallback : stored === '1');
    } catch {
      setShowSample(fallback);
    }
  }, []);

  const toggleSample = () => {
    setShowSample((current) => {
      const next = !current;
      try { window.localStorage.setItem(SAMPLE_TOGGLE_STORAGE_KEY, next ? '1' : '0'); } catch { /* per-device preference only */ }
      return next;
    });
    // A sample group/file may be open; go back to the group list.
    setOpenGroupKey(null);
    setOpenType(null);
    setViewerId(null);
  };

  const items = useMemo(() => (showSample ? [...realItems, ...sampleItems] : realItems), [showSample, realItems, sampleItems]);
  const groupRows = useMemo(() => (showSample ? [...realGroupRows, ...SAMPLE_EVIDENCE_GROUPS] : realGroupRows), [showSample, realGroupRows]);

  useEffect(() => { setView(readStoredView()); }, []);

  const changeView = (next: 'grid' | 'list') => {
    setView(next);
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, next); } catch { /* per-viewer convenience only */ }
  };

  const openGroupFolder = (key: string | null) => {
    setOpenGroupKey(key);
    setOpenType(null);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const evidence = await loadEvidenceItems();

        const groupResponse = await fetch('/api/groups?limit=200', { cache: 'no-store' });
        const groupPayload = groupResponse.ok ? await groupResponse.json() : [];

        if (cancelled) return;
        setItems(evidence);
        setGroupRows(Array.isArray(groupPayload) ? groupPayload : []);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load evidence files.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const matchesFilters = useCallback((item: EvidenceItem) => {
    const areaKey = EVIDENCE_AREAS.find((area) => area.label === areaFilter)?.key;
    const q = searchQuery.trim().toLowerCase();
    const statusOk = statusFilter === 'all' || (statusFilter === 'duplicate' ? item.duplicate : item.status === statusFilter);
    return (!areaKey || item.area === areaKey) && statusOk && (
      !q || [item.fileName, item.groupCode, item.groupTitle, item.projectTitle, item.uploadedByName, item.categoryLabel]
        .some((value) => value?.toLowerCase().includes(q))
    );
  }, [areaFilter, statusFilter, searchQuery]);

  const filtered = useMemo(() => items.filter(matchesFilters), [items, matchesFilters]);
  const filtersActive = areaFilter !== 'All' || statusFilter !== 'all' || searchQuery.trim() !== '';

  const areaTabs = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    EVIDENCE_AREAS.forEach((area) => { counts[area.label] = items.filter((item) => item.area === area.key).length; });
    return { tabs: ['All', ...EVIDENCE_AREAS.map((area) => area.label)], counts };
  }, [items]);

  // Every department group (including ones with no files yet), with its evidence checklist.
  const allGroups = useMemo<EvidenceGroup[]>(() => {
    const byKey = new Map<string, EvidenceItem[]>();
    items.forEach((item) => byKey.set(groupKeyOf(item), [...(byKey.get(groupKeyOf(item)) ?? []), item]));

    const rowByProject = new Map(groupRows.filter((row) => row.projectId).map((row) => [row.projectId as string, row]));
    const keys = new Set<string>([...rowByProject.keys(), ...byKey.keys()]);

    return Array.from(keys).map((key) => {
      const allFiles = byKey.get(key) ?? [];
      const row = rowByProject.get(key);
      const first = allFiles[0];
      const visible = allFiles.filter(matchesFilters);

      const presentLabels = new Set(allFiles.map((file) => file.categoryLabel));
      const furthestRequired = REQUIRED_SEQUENCE.reduce((furthest, label, index) => (presentLabels.has(label) ? index : furthest), -1);

      const slots: TypeSlot[] = CATEGORY_ORDER.map((label) => {
        const typeFiles = allFiles.filter((file) => file.categoryLabel === label);
        const requiredIndex = REQUIRED_SEQUENCE.indexOf(label);
        const required = requiredIndex >= 0;
        const state: SlotState = typeFiles.length ? 'present' : !required ? 'optional' : requiredIndex < furthestRequired ? 'missing' : 'upcoming';
        return {
          label,
          required,
          state,
          files: visible.filter((file) => file.categoryLabel === label),
          total: typeFiles.length,
          latest: latestDate(typeFiles)
        };
      });

      return {
        key,
        projectId: row?.projectId ?? first?.projectId ?? null,
        code: row?.code || first?.groupCode || 'Unassigned',
        title: row?.projectTitle || row?.title || first?.projectTitle || first?.groupTitle || 'No linked project',
        members: first?.groupMembers ?? [],
        stage: row?.progressStage || row?.currentMilestone || first?.milestone || null,
        progress: typeof row?.progress === 'number' ? row.progress : null,
        allFiles,
        files: slots.flatMap((slot) => slot.files),
        slots,
        ready: allFiles.filter((file) => file.status === 'ready').length,
        missingRequired: slots.filter((slot) => slot.state === 'missing').length,
        duplicates: allFiles.filter((file) => file.duplicate).length,
        lastUpload: latestDate(allFiles)
      };
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [items, groupRows, matchesFilters]);

  // Folders shown on the first level: groups with matching files (or every group when no filter is set).
  const visibleGroups = useMemo(() => allGroups.filter((group) => (
    (filtersActive ? group.files.length > 0 : true) && (!onlyMissing || group.missingRequired > 0)
  )), [allGroups, filtersActive, onlyMissing]);

  const summary = useMemo(() => ({
    ready: items.filter((item) => item.status === 'ready').length,
    inReview: items.filter((item) => item.status === 'in-review').length,
    revision: items.filter((item) => item.status === 'revision').length,
    notSubmitted: items.filter((item) => item.status === 'uploaded').length,
    duplicates: items.filter((item) => item.duplicate).length,
    groupsMissing: allGroups.filter((group) => group.missingRequired > 0).length,
    groupsEmpty: allGroups.filter((group) => group.allFiles.length === 0).length,
    removed: items.filter((item) => !item.available).length
  }), [items, allGroups]);
  const readyPct = items.length ? Math.round((summary.ready / items.length) * 100) : 0;

  // Coverage: every department project against every area.
  const coverage = useMemo(() => {
    const list = allGroups.map((group) => ({
      key: group.key,
      code: group.code,
      title: group.title,
      missingRequired: group.missingRequired,
      cells: Object.fromEntries(EVIDENCE_AREAS.map((area) => {
        const files = group.allFiles.filter((file) => file.area === area.key);
        return [area.key, { ready: files.filter((file) => file.status === 'ready').length, pending: files.filter((file) => file.status !== 'ready').length }];
      })) as Record<AreaKey, { ready: number; pending: number }>
    }));
    const complete = list.filter((row) => EVIDENCE_AREAS.every((area) => row.cells[area.key].ready > 0)).length;
    return { list, complete };
  }, [allGroups]);

  // Paginated tables (6 per page, fixed height, smooth switch), shared with the other program-head pages.
  const groupPages = useProgramHeadPagination(visibleGroups, `${areaFilter}|${statusFilter}|${searchQuery}|${onlyMissing}`);
  const coveragePages = useProgramHeadPagination(coverage.list, section);

  const openGroup = openGroupKey ? allGroups.find((group) => group.key === openGroupKey) ?? null : null;
  const openSlot = openGroup && openType ? openGroup.slots.find((slot) => slot.label === openType) ?? null : null;

  // The viewer steps through whatever is on screen.
  const viewerList = openSlot ? openSlot.files : openGroup ? openGroup.files : filtered;
  const viewerIndex = viewerId ? viewerList.findIndex((item) => item.id === viewerId) : -1;
  const viewerItem = viewerIndex >= 0 ? viewerList[viewerIndex] : null;

  const stepViewer = useCallback((delta: number) => {
    if (viewerIndex < 0 || !viewerList.length) return;
    setViewerId(viewerList[(viewerIndex + delta + viewerList.length) % viewerList.length].id);
  }, [viewerList, viewerIndex]);

  useEffect(() => {
    if (!viewerItem) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewerId(null);
      if (event.key === 'ArrowRight') stepViewer(1);
      if (event.key === 'ArrowLeft') stepViewer(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerItem, stepViewer]);

  const applyQuickFilter = (next: { status?: string; missing?: boolean }) => {
    setSection('Evidence');
    openGroupFolder(null);
    setAreaFilter('All');
    setSearchQuery('');
    setStatusFilter(next.status ?? 'all');
    setOnlyMissing(Boolean(next.missing));
  };

  const needs = [
    { key: 'revision', count: summary.revision, label: 'files need revision', icon: 'fa-rotate-left', tone: 'text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))] bg-[color-mix(in_srgb,var(--ph-c-gold)_14%,transparent)]', onClick: () => applyQuickFilter({ status: 'revision' }) },
    { key: 'review', count: summary.inReview, label: 'awaiting adviser review', icon: 'fa-hourglass-half', tone: 'text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))] bg-[color-mix(in_srgb,var(--ph-c-light)_16%,transparent)]', onClick: () => applyQuickFilter({ status: 'in-review' }) },
    { key: 'missing', count: summary.groupsMissing, label: 'groups missing required evidence', icon: 'fa-triangle-exclamation', tone: 'text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))] bg-[color-mix(in_srgb,var(--ph-c-gold)_14%,transparent)]', onClick: () => applyQuickFilter({ missing: true }) },
    { key: 'duplicate', count: summary.duplicates, label: 'possible duplicate uploads', icon: 'fa-clone', tone: 'text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))] bg-[color-mix(in_srgb,var(--ph-c-light)_16%,transparent)]', onClick: () => applyQuickFilter({ status: 'duplicate' }) },
    { key: 'unsubmitted', count: summary.notSubmitted, label: 'files never submitted for review', icon: 'fa-inbox', tone: 'text-[var(--muted)] bg-[color-mix(in_srgb,var(--ph-c-neutral)_35%,transparent)]', onClick: () => applyQuickFilter({ status: 'uploaded' }) },
    { key: 'empty', count: summary.groupsEmpty, label: 'groups with no evidence yet', icon: 'fa-folder', tone: 'text-[var(--muted)] bg-[color-mix(in_srgb,var(--ph-c-neutral)_35%,transparent)]', onClick: () => { setSection('Coverage'); openGroupFolder(null); } }
  ].filter((need) => need.count > 0);

  const downloadButton = (item: EvidenceItem) => item.available && !item.isSample && (
    <a href={downloadUrl(item.id)} aria-label={`Download ${item.fileName}`} onClick={(event) => event.stopPropagation()} className="w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--ph-brand-text)] hover:bg-[color-mix(in_srgb,var(--ph-c-navy)_10%,transparent)] inline-flex items-center justify-center transition-colors">
      <i className="fas fa-download text-xs"></i>
    </a>
  );

  const renderTile = (item: EvidenceItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setViewerId(item.id)}
      className="group text-left rounded-xl ring-1 ring-[var(--border)] bg-[var(--surface)] overflow-hidden hover:ring-[color-mix(in_srgb,var(--ph-c-navy)_40%,transparent)] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,61,222,0.12)] active:translate-y-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ph-c-navy)]"
    >
      <div className="relative aspect-[4/3] bg-[var(--surface-alt)] overflow-hidden">
        <Thumbnail item={item} className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out" iconClassName="text-3xl !bg-transparent" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-white/95 text-[var(--ph-brand-text)] flex items-center justify-center shadow-lg scale-75 group-hover:scale-100 transition-transform duration-300">
            <i className="fas fa-expand text-sm"></i>
          </span>
        </span>
        <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-white ${STATUS_META[item.status].dot} ${item.status === 'revision' ? 'ph-anim-pulse' : ''}`} title={STATUS_META[item.status].label}></span>
        <div className="absolute bottom-2 left-2 flex gap-1">
          {item.duplicate && <span className="px-1.5 py-0.5 rounded bg-[var(--ph-c-light)] text-white text-[10px] font-bold">Duplicate</span>}
          {!item.available && <span className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">Removed</span>}
          {item.isSample && <span className="px-1.5 py-0.5 rounded bg-[var(--ph-c-gold)] text-[#1f2937] text-[10px] font-bold" title="Sample data: not saved"><i className="fas fa-flask mr-1"></i>Sample</span>}
          {(item.submissionVersion ?? 1) > 1 && <span className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">v{item.submissionVersion}</span>}
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-bold text-[var(--text)] truncate group-hover:text-[var(--ph-brand-text)] transition-colors" title={item.fileName}>{item.fileName}</p>
        <p className="text-[11px] text-[var(--muted)] truncate">{formatDate(item.createdAt)} · {item.uploadedByName || 'Unknown'}</p>
      </div>
    </button>
  );

  const renderFileTable = (files: EvidenceItem[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead className="bg-[var(--surface-alt)]">
          <tr>
            <th className={PH_TH_CLASS}>File</th>
            <th className={PH_TH_CLASS}>Uploaded</th>
            <th className={PH_TH_CLASS}>Review</th>
            <th className={PH_TH_CLASS}>Status</th>
            <th className={`${PH_TH_CLASS} w-12`}><span className="sr-only">Download</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] ph-stagger">
          {files.map((item) => (
            <tr key={item.id} className="group hover:bg-[var(--surface-alt)] cursor-pointer transition-colors" onClick={() => setViewerId(item.id)}>
              <td className={`${PH_TD_CLASS} max-w-[420px]`}>
                <div className="flex items-center gap-3">
                  <Thumbnail item={item} className="w-10 h-10 shrink-0 rounded-lg" iconClassName="text-sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate group-hover:text-[var(--ph-brand-text)] transition-colors" title={item.fileName}>{item.fileName}</p>
                    <span className="text-[11px] text-[var(--muted)]">
                      {formatSize(item.fileSize)}
                      {(item.submissionVersion ?? 1) > 1 && ` · v${item.submissionVersion}`}
                      {item.duplicate && <span className="ml-1.5 font-bold text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))]">Duplicate</span>}
                    </span>
                  </div>
                </div>
              </td>
              <td className={PH_TD_CLASS}>
                <p className="text-sm text-[var(--text)] whitespace-nowrap">{formatDate(item.createdAt)}</p>
                <span className="text-[11px] text-[var(--muted)]">{item.uploadedByName || 'Unknown'}</span>
              </td>
              <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)] whitespace-nowrap`}>
                {NO_REVIEW_CATEGORIES.has(item.documentCategory) ? 'No review needed' : item.reviewedAt ? `Reviewed ${formatDate(item.reviewedAt)}` : 'Not reviewed yet'}
              </td>
              <td className={PH_TD_CLASS}><StatusLabel status={item.status} /></td>
              <td className={`${PH_TD_CLASS} text-right`}>{downloadButton(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const slotBadge = (slot: TypeSlot) => {
    if (slot.state === 'missing') return <span className="px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--ph-c-gold)_14%,transparent)] text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))] text-[10px] font-bold">Missing</span>;
    if (slot.state === 'upcoming') return <span className="px-2 py-0.5 rounded-md bg-[var(--surface-alt)] text-[var(--muted)] text-[10px] font-bold ring-1 ring-inset ring-[var(--border)]">Upcoming</span>;
    if (slot.required) return <span className="px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--ph-c-navy)_10%,transparent)] text-[var(--ph-brand-text)] text-[10px] font-bold">Required</span>;
    return null;
  };

  const renderEvidenceBody = () => {
    // Level 3: files of one evidence type inside one group.
    if (openGroup && openSlot) {
      return openSlot.files.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-[var(--muted)]">No files of this type match the current filters.</p>
      ) : view === 'grid' ? (
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 ph-stagger">
          {openSlot.files.map(renderTile)}
        </div>
      ) : renderFileTable(openSlot.files);
    }

    // Level 2: one group, evidence types as folders (checklist).
    if (openGroup) {
      const shownSlots = openGroup.slots.filter((slot) => (filtersActive ? slot.files.length > 0 : slot.state !== 'optional'));
      const emptyOptional = openGroup.slots.filter((slot) => slot.state === 'optional');

      return (
        <div className="p-5 space-y-5">
          {/* Group profile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">Members</p>
              <div className="flex flex-wrap gap-1.5">
                {openGroup.members.length ? openGroup.members.map((member) => (
                  <span key={member.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface)] ring-1 ring-inset ring-[var(--border)] text-xs font-medium text-[var(--text)]">
                    {member.isLeader && <i className="fas fa-crown text-[9px] text-[var(--ph-c-gold)]" title="Leader"></i>}{member.name}
                  </span>
                )) : <span className="text-xs text-[var(--muted)]">No member list available</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">Thesis progress</p>
              {openGroup.progress !== null && (
                <div className="flex items-center gap-2 mb-1">
                  <ProgramHeadMeter pct={openGroup.progress} className="ph-anim-meter" />
                  <span className="text-xs font-bold text-[var(--text)] tabular-nums">{openGroup.progress}%</span>
                </div>
              )}
              <p className="text-xs text-[var(--muted)]">{openGroup.stage || 'Stage not recorded'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">Evidence</p>
              <div className="flex items-center gap-2 mb-1">
                <ProgramHeadMeter pct={openGroup.allFiles.length ? Math.round((openGroup.ready / openGroup.allFiles.length) * 100) : 0} tone="bg-[var(--ph-c-navy)]" className="ph-anim-meter" />
                <span className="text-xs font-bold text-[var(--text)] tabular-nums whitespace-nowrap">{openGroup.ready}/{openGroup.allFiles.length} ready</span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Last upload {formatDate(openGroup.lastUpload)}
                {openGroup.missingRequired > 0 && <span className="text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))] font-bold"> · {openGroup.missingRequired} required missing</span>}
                {openGroup.duplicates > 0 && <span className="text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))] font-bold"> · {openGroup.duplicates} duplicates</span>}
              </p>
            </div>
          </div>

          {shownSlots.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No evidence in this group matches the current filters.</p>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 ph-stagger">
              {shownSlots.map((slot) => {
                const icon = CATEGORY_ICONS[slot.label] ?? 'fa-file';
                if (slot.state !== 'present') {
                  return (
                    <div key={slot.label} className={`rounded-xl border-2 border-dashed p-4 flex flex-col justify-between min-h-[180px] ${slot.state === 'missing' ? 'border-[color-mix(in_srgb,var(--ph-c-gold)_55%,transparent)] bg-[color-mix(in_srgb,var(--ph-c-gold)_5%,transparent)]' : 'border-[var(--border)]'}`}>
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${slot.state === 'missing' ? 'bg-[color-mix(in_srgb,var(--ph-c-gold)_14%,transparent)] text-[var(--ph-c-gold)]' : 'bg-[var(--surface-alt)] text-[var(--muted)]'}`}>
                        <i className={`fas ${icon}`}></i>
                      </span>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-bold text-[var(--text)]">{slot.label}</p>
                          {slotBadge(slot)}
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          {slot.state === 'missing'
                            ? 'Required, and the group has already moved past this stage.'
                            : 'Required once the group reaches this stage.'}
                        </p>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => setOpenType(slot.label)}
                    className="group text-left rounded-xl ring-1 ring-[var(--border)] bg-[var(--surface)] overflow-hidden hover:ring-[color-mix(in_srgb,var(--ph-c-navy)_40%,transparent)] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,61,222,0.12)] active:translate-y-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ph-c-navy)]"
                  >
                    <CoverMosaic
                      files={slot.files.length ? slot.files : openGroup.allFiles.filter((file) => file.categoryLabel === slot.label)}
                      fallbackIcon={icon}
                      badge={
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                          {slot.files.length}{slot.files.length !== slot.total ? ` of ${slot.total}` : ''} file{slot.total === 1 ? '' : 's'}
                        </span>
                      }
                    />
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[var(--text)] truncate group-hover:text-[var(--ph-brand-text)] transition-colors">
                          <i className={`fas ${icon} text-[var(--ph-brand-text)] mr-2 text-xs`}></i>{slot.label}
                        </p>
                        {slotBadge(slot)}
                      </div>
                      <StatusBreakdown files={openGroup.allFiles.filter((file) => file.categoryLabel === slot.label)} />
                      <p className="text-[11px] text-[var(--muted)]">Latest upload {formatDate(slot.latest)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl ring-1 ring-[var(--border)] overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead className="bg-[var(--surface-alt)]">
                  <tr>
                    <th className={PH_TH_CLASS}>Evidence Type</th>
                    <th className={PH_TH_CLASS}>Files</th>
                    <th className={PH_TH_CLASS}>Status</th>
                    <th className={PH_TH_CLASS}>Latest Upload</th>
                    <th className={`${PH_TH_CLASS} w-10`}><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] ph-stagger">
                  {shownSlots.map((slot) => (
                    <tr
                      key={slot.label}
                      className={`group transition-colors ${slot.state === 'present' ? 'hover:bg-[var(--surface-alt)] cursor-pointer' : ''}`}
                      onClick={slot.state === 'present' ? () => setOpenType(slot.label) : undefined}
                    >
                      <td className={PH_TD_CLASS}>
                        <div className="flex items-center gap-2.5">
                          <i className={`fas ${CATEGORY_ICONS[slot.label] ?? 'fa-file'} text-xs ${slot.state === 'missing' ? 'text-[var(--ph-c-gold)]' : 'text-[var(--ph-brand-text)]'}`}></i>
                          <span className="text-sm font-bold text-[var(--text)]">{slot.label}</span>
                          {slotBadge(slot)}
                        </div>
                      </td>
                      <td className={`${PH_TD_CLASS} text-sm font-semibold text-[var(--text)] tabular-nums`}>{slot.total || '—'}</td>
                      <td className={PH_TD_CLASS}>
                        {slot.total ? <StatusBreakdown files={openGroup.allFiles.filter((file) => file.categoryLabel === slot.label)} /> : <span className="text-xs text-[var(--muted)]">Not uploaded</span>}
                      </td>
                      <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)] whitespace-nowrap`}>{formatDate(slot.latest)}</td>
                      <td className={`${PH_TD_CLASS} text-right`}>
                        {slot.state === 'present' && <i className="fas fa-chevron-right text-xs text-[var(--muted)] group-hover:text-[var(--ph-brand-text)] group-hover:translate-x-0.5 transition-all"></i>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!filtersActive && emptyOptional.length > 0 && (
            <p className="text-xs text-[var(--muted)]">
              <span className="font-bold">Optional, not uploaded:</span> {emptyOptional.map((slot) => slot.label).join(', ')}
            </p>
          )}
        </div>
      );
    }

    // Level 1: group folders.
    if (visibleGroups.length === 0) {
      return (
        <div className="px-5 py-12 text-center">
          <p className="font-bold text-[var(--text)]">{items.length ? 'No groups match these filters' : 'No evidence yet'}</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            {items.length
              ? 'Try another area, status or search term.'
              : 'Files appear here once groups upload manuscripts, defense evidence, awards or activity photos through Document Submissions.'}
          </p>
        </div>
      );
    }

    return view === 'grid' ? (
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 ph-stagger">
        {visibleGroups.map((group) => {
          const shownFiles = filtersActive ? group.files : group.allFiles;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => openGroupFolder(group.key)}
              className="group text-left rounded-xl ring-1 ring-[var(--border)] bg-[var(--surface)] overflow-hidden hover:ring-[color-mix(in_srgb,var(--ph-c-navy)_40%,transparent)] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,61,222,0.12)] active:translate-y-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ph-c-navy)]"
            >
              <CoverMosaic
                files={shownFiles}
                fallbackIcon="fa-folder-open"
                badge={
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                    {shownFiles.length} file{shownFiles.length === 1 ? '' : 's'}
                  </span>
                }
              />
              <div className="p-3.5 space-y-2.5">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono font-bold text-[var(--ph-brand-text)] flex items-center gap-1.5">{group.code}{group.code.startsWith('DEMO-') && <span className="font-sans px-1.5 py-px rounded bg-[color-mix(in_srgb,var(--ph-c-gold)_22%,transparent)] text-[color-mix(in_srgb,var(--ph-c-gold)_60%,var(--text))] text-[9px] uppercase tracking-wider">Sample</span>}</p>
                    {group.missingRequired > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ph-c-gold)_14%,transparent)] text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))] text-[10px] font-bold">{group.missingRequired} missing</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--text)] truncate group-hover:text-[var(--ph-brand-text)] transition-colors" title={group.title}>{group.title}</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {group.members.length ? `${group.members.length} members` : 'Members not listed'}
                    {group.stage && ` · ${group.stage}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.slots.filter((slot) => slot.total > 0).map((slot) => (
                    <span key={slot.label} title={slot.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] text-[11px] font-semibold text-[var(--muted)]">
                      <i className={`fas ${CATEGORY_ICONS[slot.label] ?? 'fa-file'} text-[10px] text-[var(--ph-brand-text)]`}></i>
                      {slot.total}
                    </span>
                  ))}
                  {group.allFiles.length === 0 && <span className="text-[11px] text-[var(--muted)]">No evidence uploaded yet</span>}
                </div>
                <div className="flex items-center gap-2">
                  <ProgramHeadMeter pct={group.allFiles.length ? Math.round((group.ready / group.allFiles.length) * 100) : 0} tone="bg-[var(--ph-c-navy)]" className="ph-anim-meter" />
                  <span className="text-[11px] font-bold text-[var(--muted)] tabular-nums whitespace-nowrap">{group.ready}/{group.allFiles.length} ready</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="bg-[var(--surface-alt)]">
            <tr>
              <th className={PH_TH_CLASS}>Group</th>
              <th className={PH_TH_CLASS}>Evidence Types</th>
              <th className={PH_TH_CLASS}>Gaps</th>
              <th className={`${PH_TH_CLASS} w-44`}>Readiness</th>
              <th className={PH_TH_CLASS}>Last Upload</th>
              <th className={`${PH_TH_CLASS} w-10`}><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody key={groupPages.bodyKey} {...groupPages.bodyProps} className={`divide-y divide-[var(--border)] ${groupPages.bodyProps.className}`}>
            {groupPages.pageItems.map((group) => (
              <tr key={group.key} className={`group ${PH_ROW_HEIGHT_CLASS} hover:bg-[var(--surface-alt)] cursor-pointer transition-colors`} onClick={() => openGroupFolder(group.key)}>
                <td className={`${PH_TD_CLASS} max-w-[320px]`}>
                  <p className="text-sm font-bold text-[var(--text)] truncate group-hover:text-[var(--ph-brand-text)] transition-colors" title={group.title}>{group.title}</p>
                  <span className="text-[11px] text-[var(--muted)]"><span className="font-mono">{group.code}</span>{group.stage && ` · ${group.stage}`}</span>
                </td>
                <td className={PH_TD_CLASS}>
                  <div className="flex flex-wrap gap-1.5">
                    {group.slots.filter((slot) => slot.total > 0).map((slot) => (
                      <span key={slot.label} title={slot.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] text-[11px] font-semibold text-[var(--muted)]">
                        <i className={`fas ${CATEGORY_ICONS[slot.label] ?? 'fa-file'} text-[10px] text-[var(--ph-brand-text)]`}></i>{slot.total}
                      </span>
                    ))}
                    {group.allFiles.length === 0 && <span className="text-xs text-[var(--muted)]">None yet</span>}
                  </div>
                </td>
                <td className={`${PH_TD_CLASS} text-xs font-bold whitespace-nowrap`}>
                  {group.missingRequired > 0 && <span className="text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))] block">{group.missingRequired} required missing</span>}
                  {group.duplicates > 0 && <span className="text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))] block">{group.duplicates} duplicates</span>}
                  {!group.missingRequired && !group.duplicates && <span className="text-[var(--muted)] font-medium">—</span>}
                </td>
                <td className={PH_TD_CLASS}>
                  <div className="flex items-center gap-2">
                    <ProgramHeadMeter pct={group.allFiles.length ? Math.round((group.ready / group.allFiles.length) * 100) : 0} tone="bg-[var(--ph-c-navy)]" className="ph-anim-meter" />
                    <span className="text-xs font-bold text-[var(--text)] tabular-nums whitespace-nowrap">{group.ready}/{group.allFiles.length}</span>
                  </div>
                </td>
                <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)] whitespace-nowrap`}>{formatDate(group.lastUpload)}</td>
                <td className={`${PH_TD_CLASS} text-right`}>
                  <i className="fas fa-chevron-right text-xs text-[var(--muted)] group-hover:text-[var(--ph-brand-text)] group-hover:translate-x-0.5 transition-all"></i>
                </td>
              </tr>
            ))}
            <ProgramHeadFillerRows count={groupPages.fillerCount} colSpan={6} />
          </tbody>
        </table>
        <ProgramHeadPaginationBar
          currentPage={groupPages.currentPage}
          pageCount={groupPages.pageCount}
          pageStart={groupPages.pageStart}
          shownCount={groupPages.pageItems.length}
          total={groupPages.total}
          onPage={groupPages.goToPage}
          noun="groups"
        />
      </div>
    );
  };

  const footerText = openSlot
    ? <><strong className="text-[var(--text)]">{openSlot.files.length}</strong> {openSlot.label} file{openSlot.files.length === 1 ? '' : 's'} · click any file to preview</>
    : openGroup
      ? <><strong className="text-[var(--text)]">{openGroup.allFiles.length}</strong> files in {openGroup.code} · open an evidence type to see its files</>
      : <><strong className="text-[var(--text)]">{visibleGroups.length}</strong> groups · {filtered.length} of {items.length} files · open a group to see its evidence by type</>;

  return (
    <ProgramHeadShell activeNav="evidence" title="Accreditation & Evidence Management" description="Prepare documentation for program accreditation and quality assurance" notificationCount={2}>
      <div className="space-y-5">
        <ProgramHeadPageHeader
          description="Evidence collected from student and adviser submissions, grouped by project group and evidence type."
          actions={
            <>
              <button
                type="button"
                role="switch"
                aria-checked={showSample}
                onClick={toggleSample}
                title="Mix clearly labelled sample evidence into this page. Sample data is never saved."
                className="h-10 px-3 rounded-xl ring-1 ring-inset ring-[var(--border)] bg-[var(--surface)] flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Sample data
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showSample ? 'bg-[var(--ph-c-navy)]' : 'bg-[var(--ph-c-neutral)]'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${showSample ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </span>
              </button>
              <ProgramHeadPrimaryAction icon="fa-file-alt" onClick={() => setReportOpen(true)}>Accreditation Report</ProgramHeadPrimaryAction>
            </>
          }
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 ph-stagger">
          <ProgramHeadStatCard
            className="hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,61,222,0.10)] transition-all duration-200"
            title="Evidence Files"
            value={isLoading ? '—' : <ProgramHeadAnimatedNumber value={items.length} />}
            note={isLoading ? 'Loading…' : `From ${allGroups.filter((group) => group.allFiles.length).length} groups`}
            icon="fas fa-folder-open"
          />
          <ProgramHeadStatCard
            className="hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,185,129,0.12)] transition-all duration-200"
            title="Accreditation-ready"
            value={isLoading ? '—' : <><ProgramHeadAnimatedNumber value={readyPct} />%</>}
            note={`${summary.ready} approved or logged`}
            icon="fas fa-shield-alt"
            iconTone="bg-[color-mix(in_srgb,var(--ph-c-navy)_10%,transparent)] text-[var(--ph-brand-text)]"
          >
            {!isLoading && <ProgramHeadMeter pct={readyPct} tone="bg-[var(--ph-c-navy)]" className="ph-anim-meter" />}
          </ProgramHeadStatCard>
          <ProgramHeadStatCard
            className="hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(147,51,234,0.10)] transition-all duration-200"
            title="Groups Fully Covered"
            value={isLoading ? '—' : <><ProgramHeadAnimatedNumber value={coverage.complete} /><span className="text-lg text-[var(--muted)]">/{coverage.list.length}</span></>}
            note="Ready evidence in every area"
            icon="fas fa-table-cells"
            iconTone="bg-[color-mix(in_srgb,var(--ph-c-light)_16%,transparent)] text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))]"
          >
            {!isLoading && <ProgramHeadMeter pct={coverage.list.length ? (coverage.complete / coverage.list.length) * 100 : 0} tone="bg-[var(--ph-c-light)]" className="ph-anim-meter" />}
          </ProgramHeadStatCard>
          <ProgramHeadStatCard
            className="hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(245,158,11,0.12)] transition-all duration-200"
            title="Awaiting Action"
            value={isLoading ? '—' : <ProgramHeadAnimatedNumber value={summary.inReview + summary.revision} />}
            note={`${summary.inReview} in review · ${summary.revision} need revision`}
            icon="fas fa-hourglass-half"
            iconTone="bg-[color-mix(in_srgb,var(--ph-c-gold)_14%,transparent)] text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))]"
          />
        </div>

        {/* Needs attention */}
        {!isLoading && !loadError && needs.length > 0 && (
          <div className={`${PH_CARD_CLASS} px-5 py-3 ph-anim-fade-up`} style={{ ['--i' as string]: 4 }}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 ph-stagger">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mr-1 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--ph-c-gold)] ph-anim-pulse"></span>Needs attention
              </span>
              {needs.map((need) => (
                <button
                  key={need.key}
                  type="button"
                  onClick={need.onClick}
                  className="group/need h-8 pl-1 pr-3 rounded-lg ring-1 ring-[var(--border)] hover:ring-[color-mix(in_srgb,var(--ph-c-navy)_40%,transparent)] hover:bg-[var(--surface-alt)] hover:-translate-y-px active:translate-y-0 transition-all inline-flex items-center gap-2 text-xs"
                >
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] group-hover/need:scale-110 transition-transform ${need.tone}`}><i className={`fas ${need.icon}`}></i></span>
                  <strong className="text-[var(--text)] tabular-nums">{need.count}</strong>
                  <span className="text-[var(--muted)]">{need.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={PH_CARD_CLASS}>
          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-[var(--border)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative inline-grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-alt)] ring-1 ring-[var(--border)]" role="tablist" aria-label="Section">
                {/* Sliding highlight behind the active tab */}
                <span
                  aria-hidden="true"
                  className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--surface)] shadow-sm ring-1 ring-[var(--border)] transition-transform duration-300 ease-out"
                  style={{ transform: section === 'Coverage' ? 'translateX(100%)' : 'translateX(0)' }}
                ></span>
                {([['Evidence', 'fa-images'], ['Coverage', 'fa-table-cells']] as const).map(([tab, icon]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={section === tab}
                    onClick={() => setSection(tab)}
                    className={`relative h-8 px-4 min-w-[118px] rounded-lg text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 ${section === tab ? 'text-[var(--ph-brand-text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                  >
                    <i className={`fas ${icon} text-xs`}></i>{tab}
                  </button>
                ))}
              </div>

              {section === 'Evidence' && (
                <div className="flex flex-wrap items-center gap-2">
                  <ProgramHeadSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search file, group, uploader..." />
                  <ProgramHeadFilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
                  <div className="relative inline-grid grid-cols-2 p-0.5 rounded-lg ring-1 ring-[var(--border)] bg-[var(--surface-alt)]" role="group" aria-label="Layout">
                    <span
                      aria-hidden="true"
                      className="absolute top-0.5 bottom-0.5 left-0.5 w-8 rounded-md bg-[var(--ph-c-navy)] shadow-sm transition-transform duration-300 ease-out"
                      style={{ transform: view === 'list' ? 'translateX(100%)' : 'translateX(0)' }}
                    ></span>
                    {([['grid', 'fa-grip', 'Grid view'], ['list', 'fa-list', 'List view']] as const).map(([mode, icon, label]) => (
                      <button
                        key={mode}
                        type="button"
                        aria-label={label}
                        aria-pressed={view === mode}
                        title={label}
                        onClick={() => changeView(mode)}
                        className={`relative w-8 h-8 rounded-md flex items-center justify-center text-xs transition-colors duration-300 ${view === mode ? 'text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                      >
                        <i className={`fas ${icon}`}></i>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {section === 'Evidence' && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ProgramHeadTabs tabs={areaTabs.tabs} value={areaFilter} onChange={setAreaFilter} counts={areaTabs.counts} />
                {onlyMissing && (
                  <button type="button" onClick={() => setOnlyMissing(false)} className="h-7 px-2.5 rounded-md bg-[color-mix(in_srgb,var(--ph-c-gold)_14%,transparent)] text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))] text-xs font-bold inline-flex items-center gap-1.5">
                    Only groups missing required evidence <i className="fas fa-times text-[10px]"></i>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Breadcrumb */}
          {section === 'Evidence' && openGroup && (
            <div key={`crumb-${openGroupKey}-${openType}`} className="px-5 py-2.5 border-b border-[var(--border)] bg-gradient-to-r from-[color-mix(in_srgb,var(--ph-c-navy)_6%,transparent)] via-[var(--surface-alt)] to-[var(--surface-alt)] flex items-center gap-3 ph-anim-fade-in">
              <button
                type="button"
                aria-label="Back"
                onClick={() => (openSlot ? setOpenType(null) : openGroupFolder(null))}
                className="w-8 h-8 shrink-0 rounded-lg ring-1 ring-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:text-[var(--ph-brand-text)] transition-colors"
              >
                <i className="fas fa-arrow-left text-xs"></i>
              </button>
              <Breadcrumb
                trail={[
                  { label: 'All groups', onClick: () => openGroupFolder(null) },
                  openSlot
                    ? { label: <><span className="font-mono">{openGroup.code}</span> {openGroup.title}</>, onClick: () => setOpenType(null) }
                    : { label: <><span className="font-mono text-[var(--ph-brand-text)]">{openGroup.code}</span> {openGroup.title}</> },
                  ...(openSlot ? [{ label: openSlot.label }] : [])
                ]}
              />
            </div>
          )}

          {/* Body — keyed by level so every navigation animates in */}
          <div key={`${section}-${openGroupKey ?? 'all'}-${openType ?? 'types'}-${view}`} className="ph-anim-fade-in">
          {isLoading ? (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-xl ring-1 ring-[var(--border)] overflow-hidden">
                  <div className="aspect-[16/9] ph-shimmer"></div>
                  <div className="p-3.5 space-y-2.5">
                    <div className="h-2.5 w-1/4 rounded ph-shimmer"></div>
                    <div className="h-3 w-3/4 rounded ph-shimmer"></div>
                    <div className="h-1.5 w-full rounded ph-shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="px-5 py-12 text-center">
              <p className="font-bold text-[var(--text)]">Couldn&apos;t load evidence</p>
              <p className="text-sm text-[var(--muted)] mt-1">{loadError}</p>
            </div>
          ) : section === 'Coverage' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-[var(--surface-alt)]">
                  <tr>
                    <th className={PH_TH_CLASS}>Group</th>
                    {EVIDENCE_AREAS.map((area) => (
                      <th key={area.key} className={`${PH_TH_CLASS} text-center`}>{area.label}</th>
                    ))}
                    <th className={`${PH_TH_CLASS} text-center`}>Required Gaps</th>
                  </tr>
                </thead>
                <tbody key={coveragePages.bodyKey} {...coveragePages.bodyProps} className={`divide-y divide-[var(--border)] ${coveragePages.bodyProps.className}`}>
                  {coverage.list.length === 0 ? (
                    <tr><td colSpan={EVIDENCE_AREAS.length + 2} className="px-5 py-12 text-center text-sm text-[var(--muted)]">No department groups found.</td></tr>
                  ) : coveragePages.pageItems.map((row) => (
                    <tr
                      key={row.key}
                      className={`group ${PH_ROW_HEIGHT_CLASS} hover:bg-[var(--surface-alt)] cursor-pointer transition-colors`}
                      onClick={() => { setSection('Evidence'); openGroupFolder(row.key); }}
                    >
                      <td className={`${PH_TD_CLASS} max-w-[320px]`}>
                        <p className="text-sm font-bold text-[var(--text)] truncate group-hover:text-[var(--ph-brand-text)] transition-colors" title={row.title}>{row.title}</p>
                        <span className="text-[11px] font-mono text-[var(--muted)]">{row.code}</span>
                      </td>
                      {EVIDENCE_AREAS.map((area) => {
                        const cell = row.cells[area.key];
                        return (
                          <td key={area.key} className={`${PH_TD_CLASS} text-center`}>
                            {cell.ready > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-bold bg-[color-mix(in_srgb,var(--ph-c-navy)_10%,transparent)] text-[var(--ph-brand-text)]"
                                title={`${cell.ready} ready${cell.pending ? `, ${cell.pending} pending` : ''}`}
                              >
                                <i className="fas fa-circle-check text-[10px]"></i>{cell.ready}
                              </span>
                            ) : cell.pending > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold bg-[color-mix(in_srgb,var(--ph-c-light)_16%,transparent)] text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))]"
                                title={`${cell.pending} not yet approved`}
                              >
                                <i className="fas fa-hourglass-half text-[9px]"></i>In review
                              </span>
                            ) : (
                              <span className="inline-block w-5 h-1 rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] align-middle" title="Nothing uploaded"></span>
                            )}
                          </td>
                        );
                      })}
                      <td className={`${PH_TD_CLASS} text-center`}>
                        {row.missingRequired > 0
                          ? (
                            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold bg-[color-mix(in_srgb,var(--ph-c-gold)_16%,transparent)] text-[color-mix(in_srgb,var(--ph-c-gold)_65%,var(--text))]">
                              <i className="fas fa-triangle-exclamation text-[9px]"></i>{row.missingRequired} missing
                            </span>
                          )
                          : <span className="text-xs font-bold text-[var(--ph-brand-text)]" title="No required evidence missing"><i className="fas fa-check"></i></span>}
                      </td>
                    </tr>
                  ))}
                  <ProgramHeadFillerRows count={coveragePages.fillerCount} colSpan={EVIDENCE_AREAS.length + 2} />
                </tbody>
              </table>
              <ProgramHeadPaginationBar
                currentPage={coveragePages.currentPage}
                pageCount={coveragePages.pageCount}
                pageStart={coveragePages.pageStart}
                shownCount={coveragePages.pageItems.length}
                total={coveragePages.total}
                onPage={coveragePages.goToPage}
                noun="groups"
              />
            </div>
          ) : renderEvidenceBody()}
          </div>

          {!isLoading && !loadError && section === 'Evidence' && !(view === 'list' && !openGroup) && (
            <div className="px-5 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">{footerText}</div>
          )}
        </div>
      </div>

      {/* Viewer */}
      {viewerItem && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-stretch justify-center p-0 md:p-6 ph-anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={viewerItem.fileName}
          onClick={(event) => { if (event.target === event.currentTarget) setViewerId(null); }}
        >
          <div className="w-full max-w-7xl bg-[var(--surface)] md:rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-2xl ph-anim-scale-in">
            <div className="relative flex-1 min-h-[50vh] bg-slate-900 flex items-center justify-center">
              {!viewerItem.available ? (
                <p className="text-sm text-slate-300 px-6 text-center">This file was removed from storage after a revision request.</p>
              ) : hasImage(viewerItem) ? (
                // eslint-disable-next-line @next/next/no-img-element -- authenticated API stream, not a static asset
                <img key={viewerItem.id} src={imageSrc(viewerItem)} alt={viewerItem.fileName} className="max-w-full max-h-[85vh] object-contain ph-anim-scale-in" />
              ) : viewerItem.isSample ? (
                <div className="text-center text-slate-300 px-6">
                  <FileGlyph kind={viewerItem.kind} className="w-16 h-16 rounded-2xl text-2xl mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white">Sample document</p>
                  <p className="text-xs mt-1">Sample files have no stored copy to preview.</p>
                </div>
              ) : viewerItem.kind === 'pdf' ? (
                <iframe key={viewerItem.id} src={previewUrl(viewerItem.id)} title={viewerItem.fileName} className="w-full h-full min-h-[70vh] bg-white" />
              ) : (
                <div className="text-center text-slate-300">
                  <FileGlyph kind="other" className="w-16 h-16 rounded-2xl text-2xl mx-auto mb-3" />
                  <p className="text-sm">No inline preview for this file type.</p>
                </div>
              )}
              {viewerList.length > 1 && (
                <>
                  <button type="button" aria-label="Previous file" onClick={() => stepViewer(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:scale-110 active:scale-95 transition-all">
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button type="button" aria-label="Next file" onClick={() => stepViewer(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:scale-110 active:scale-95 transition-all">
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </>
              )}
            </div>

            <aside className="w-full lg:w-80 shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-[var(--border)] max-h-[100vh]">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{viewerIndex + 1} of {viewerList.length}</p>
                  <h3 className="text-sm font-bold text-[var(--text)] break-words">{viewerItem.fileName}</h3>
                </div>
                <button type="button" aria-label="Close preview" onClick={() => setViewerId(null)} className="w-8 h-8 shrink-0 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="px-5 py-4 space-y-4 text-sm flex-1 overflow-y-auto">
                {viewerItem.duplicate && (
                  <p className="rounded-lg bg-[color-mix(in_srgb,var(--ph-c-light)_16%,transparent)] text-[color-mix(in_srgb,var(--ph-c-light)_75%,var(--text))] text-xs font-semibold p-2.5">
                    <i className="fas fa-clone mr-1.5"></i>Another file with this name was uploaded for the same evidence type.
                  </p>
                )}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {([
                    ['Status', <StatusLabel key="status" status={viewerItem.status} />, true],
                    ['Evidence type', viewerItem.categoryLabel, true],
                    ['Area', EVIDENCE_AREAS.find((area) => area.key === viewerItem.area)?.label, false],
                    ['Group', viewerItem.groupCode || '—', false],
                    ['Project', viewerItem.projectTitle || viewerItem.groupTitle || '—', true],
                    ['Uploaded by', viewerItem.uploadedByName || 'Unknown', false],
                    ['Uploaded', formatDate(viewerItem.createdAt), false],
                    ['Submitted', formatDate(viewerItem.submittedAt), false],
                    ['Reviewed', NO_REVIEW_CATEGORIES.has(viewerItem.documentCategory) ? 'Not required' : formatDate(viewerItem.reviewedAt), false],
                    ['Version', viewerItem.submissionVersion ? `v${viewerItem.submissionVersion}` : '—', false],
                    ['Size', formatSize(viewerItem.fileSize), false]
                  ] as const).map(([label, value, wide]) => (
                    <div key={label} className={wide ? 'col-span-2' : ''}>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</dt>
                      <dd className="font-medium text-[var(--text)] break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
                {viewerItem.reviewComments && viewerItem.reviewComments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Review history</p>
                    <ol className="space-y-2">
                      {viewerItem.reviewComments.map((comment) => {
                        const decision = DECISION_LABELS[(comment.decision || '').toUpperCase()] ?? DECISION_LABELS.COMMENT;
                        return (
                          <li key={comment.id} className="rounded-lg bg-[var(--surface-alt)] ring-1 ring-[var(--border)] p-2.5">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-[11px] font-bold ${decision.className}`}>{decision.label}</span>
                              <span className="text-[10px] text-[var(--muted)]">{formatDate(comment.createdAt)}</span>
                            </div>
                            {comment.body && <p className="text-xs text-[var(--text)] leading-relaxed">{comment.body}</p>}
                            {comment.authorName && <p className="text-[10px] text-[var(--muted)] mt-1">— {comment.authorName}</p>}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
              {viewerItem.available && !viewerItem.isSample && (
                <div className="px-5 py-4 border-t border-[var(--border)] grid grid-cols-2 gap-2">
                  <a href={previewUrl(viewerItem.id)} target="_blank" rel="noopener noreferrer" className="h-10 rounded-xl ring-1 ring-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors flex items-center justify-center gap-2">
                    <i className="fas fa-up-right-from-square text-xs"></i> Open
                  </a>
                  <a href={downloadUrl(viewerItem.id)} className="h-10 rounded-xl bg-[var(--ph-c-navy)] text-white text-sm font-bold hover:bg-[#0c31b3] transition-colors flex items-center justify-center gap-2">
                    <i className="fas fa-download text-xs"></i> Download
                  </a>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      <ProgramHeadModal open={reportOpen} title="Generate Accreditation Report" onClose={() => setReportOpen(false)}>
        <div className="ph-form-field">
          <label htmlFor="ph-evidence-report-type">Report Type</label>
          <select className="ph-select" id="ph-evidence-report-type" defaultValue="Evidence Portfolio">
            <option>Evidence Portfolio</option><option>Coverage Summary</option><option>Self-Assessment Report</option>
          </select>
        </div>
        <div className="ph-form-field">
          <label htmlFor="ph-evidence-body">Accreditation Body</label>
          <select className="ph-select" id="ph-evidence-body" defaultValue="CHED">
            <option>CHED</option><option>AACCUP</option><option>PACUCOA</option><option>ABET</option>
          </select>
        </div>
        <div className="ph-form-field">
          <label>Areas to Include</label>
          <div className="ph-checkbox-list">
            {EVIDENCE_AREAS.map((area) => (
              <label key={area.key}><input defaultChecked type="checkbox" /> {area.label}</label>
            ))}
          </div>
        </div>
        <div className="ph-modal-actions">
          <ProgramHeadButton onClick={() => setReportOpen(false)}>Cancel</ProgramHeadButton>
          <ProgramHeadButton variant="primary" onClick={() => setReportOpen(false)}>Generate</ProgramHeadButton>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
