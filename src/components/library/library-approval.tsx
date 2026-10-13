'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LibraryShell } from '@/components/library/library-shell';
import {
  LibraryClearanceSlipModal,
  type ClearanceData
} from '@/components/library/library-clearance-slip-modal';

export type ArchivalStatus = 'pending' | 'to-archive' | 'archived' | 'returned';

export type ArchivalRequirement = {
  name: string;
  status: 'Approved' | 'Pending' | 'Needs Revision';
};

export type ArchivalSubmission = {
  id: string; // e.g. 'CAP-IT-2025-014'
  title: string;
  department: string; // 'BSIT'
  projectType: string; // 'Capstone Project'
  authors: string[];
  adviser: string;
  validatedBy: string; // 'Engr. Lara Mercado · Sep 22, 2026, 10:15 AM'
  requirementsSummary: string; // '3/3 submitted at validation'
  validationNotes: string; // 'All requirements verified. Manuscript, approval sheet, and Q3 progress report are on file.'
  abstract: string; // 'A learning management system that uses student activity data to predict course performance and flag learners who may need early intervention from instructors.'
  keywords: string; // 'AI, Education, Predictive Analytics'
  manuscriptFile: {
    name: string;
    size: string;
    status: string;
  };
  postDefenseRequirements: {
    total: number;
    completed: number;
    label: string;
    items: ArchivalRequirement[];
  };
  validatedAt: string; // 'Validated Sep 22, 2026, 10:15 AM'
  status: ArchivalStatus;
  statusLabel: string;
  callNumber?: string;
  returnRemarks?: string;
  archivedAt?: string;
};

const DEFAULT_SUBMISSIONS: ArchivalSubmission[] = [
  {
    id: 'CAP-IT-2025-014',
    title: 'AI-Powered Learning Management System with Predictive Analytics',
    department: 'BSIT',
    projectType: 'Capstone Project',
    authors: ['Juan Dela Cruz', 'Maria Santos', 'Paolo Reyes'],
    adviser: 'Dr. Ricardo Cruz',
    validatedBy: 'Engr. Lara Mercado · Sep 22, 2026, 10:15 AM',
    requirementsSummary: '3/3 submitted at validation',
    validationNotes: 'All requirements verified. Manuscript, approval sheet, and Q3 progress report are on file.',
    abstract: 'A learning management system that uses student activity data to predict course performance and flag learners who may need early intervention from instructors.',
    keywords: 'AI, Education, Predictive Analytics',
    manuscriptFile: {
      name: 'CAP-IT-2025-014-Manuscript.pdf',
      size: '4.2 MB',
      status: 'Approved'
    },
    postDefenseRequirements: {
      total: 8,
      completed: 8,
      label: '3/3 post-defense requirements',
      items: [
        { name: 'Final corrected manuscript', status: 'Approved' },
        { name: 'Adviser approval / endorsement', status: 'Approved' },
        { name: 'Panel approval and signature pages', status: 'Approved' },
        { name: 'Program Head endorsement', status: 'Approved' },
        { name: 'IP disclosure form', status: 'Approved' },
        { name: 'IP evaluation / endorsement', status: 'Approved' },
        { name: 'Research completion / submission form', status: 'Approved' },
        { name: 'Required clearance documents', status: 'Approved' }
      ]
    },
    validatedAt: 'Validated Sep 22, 2026, 10:15 AM',
    status: 'pending',
    statusLabel: 'Pending Repository Approval'
  },
  {
    id: 'CAP-MET-2024-002',
    title: 'Smart Solar Energy Monitoring System with Real-Time Efficiency Logging',
    department: 'BSMET',
    projectType: 'Capstone Project',
    authors: ['Christian Flores', 'Mark Delgado', 'Arlene Tan'],
    adviser: 'Engr. Ramon Bautista',
    validatedBy: 'Engr. Dennis Mendoza · Aug 15, 2026, 02:30 PM',
    requirementsSummary: '3/3 submitted at validation',
    validationNotes: 'Telemetry calibration and safety relay documentation verified.',
    abstract: 'Internet-of-things photovoltaic energy generation monitoring platform with continuous current, voltage, and efficiency telemetry.',
    keywords: 'Solar Energy, IoT, Telemetry, ESP32',
    manuscriptFile: {
      name: 'CAP-MET-2024-002-Final-Manuscript.pdf',
      size: '6.8 MB',
      status: 'Approved'
    },
    postDefenseRequirements: {
      total: 8,
      completed: 8,
      label: '3/3 post-defense requirements',
      items: [
        { name: 'Final corrected manuscript', status: 'Approved' },
        { name: 'Adviser approval / endorsement', status: 'Approved' },
        { name: 'Panel approval and signature pages', status: 'Approved' },
        { name: 'Program Head endorsement', status: 'Approved' },
        { name: 'IP disclosure form', status: 'Approved' },
        { name: 'IP evaluation / endorsement', status: 'Approved' },
        { name: 'Research completion / submission form', status: 'Approved' },
        { name: 'Required clearance documents', status: 'Approved' }
      ]
    },
    validatedAt: 'Validated Aug 15, 2026, 02:30 PM',
    status: 'archived',
    statusLabel: 'Archived in Repository',
    callNumber: 'LIB-2024-MET-002',
    archivedAt: 'Sep 01, 2026, 09:00 AM'
  }
];

export function LibraryApproval() {
  const [submissions, setSubmissions] = useState<ArchivalSubmission[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('thesistrack_library_archived_approvals_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_SUBMISSIONS;
  });

  const [activeTab, setActiveTab] = useState<ArchivalStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveDatabase, setIsLiveDatabase] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ArchivalSubmission | null>(null);
  const [clearanceModalData, setClearanceModalData] = useState<ClearanceData | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [isReturnPromptOpen, setIsReturnPromptOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  };

  const openClearanceModal = (sub: ArchivalSubmission) => {
    const accessionCallNum = sub.callNumber || `LIB-${new Date().getFullYear()}-${sub.department.replace('BS', '')}-${sub.id.split('-').pop() || '014'}`;
    const serialNum = `CLR-${new Date().getFullYear()}-${sub.id.replace('CAP-', '')}`;
    setClearanceModalData({
      serialNumber: serialNum,
      submissionId: sub.id,
      callNumber: accessionCallNum,
      title: sub.title,
      authors: sub.authors,
      department: sub.department,
      adviser: sub.adviser,
      projectType: sub.projectType,
      validatedBy: sub.validatedBy,
      archivedAt: sub.archivedAt || new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      librarianName: 'Dr. Patricia E. Alcantara, RL'
    });
  };

  const saveSubmissions = (updated: ArchivalSubmission[]) => {
    setSubmissions(updated);
    try {
      localStorage.setItem('thesistrack_library_archived_approvals_v2', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Status counts for top KPI cards
  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === 'pending').length,
    [submissions]
  );
  const toArchiveCount = useMemo(
    () => submissions.filter((s) => s.status === 'to-archive').length,
    [submissions]
  );
  const archivedCount = useMemo(
    () => submissions.filter((s) => s.status === 'archived').length,
    [submissions]
  );
  const returnedCount = useMemo(
    () => submissions.filter((s) => s.status === 'returned').length,
    [submissions]
  );

  // Filtered submissions based on active tab and search query
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (sub.status !== activeTab) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        sub.title.toLowerCase().includes(q) ||
        sub.id.toLowerCase().includes(q) ||
        sub.department.toLowerCase().includes(q) ||
        sub.authors.join(' ').toLowerCase().includes(q) ||
        sub.adviser.toLowerCase().includes(q)
      );
    });
  }, [submissions, activeTab, searchQuery]);

  // Handle Approve for Repository
  const handleApproveForRepository = () => {
    if (!selectedSubmission) return;

    const accessionCallNum = selectedSubmission.callNumber || `LIB-${new Date().getFullYear()}-${selectedSubmission.department.replace('BS', '')}-${selectedSubmission.id.split('-').pop() || '014'}`;
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const approvedItem: ArchivalSubmission = {
      ...selectedSubmission,
      status: 'archived' as ArchivalStatus,
      statusLabel: 'Archived in Repository',
      callNumber: accessionCallNum,
      archivedAt: timestamp
    };

    const updated = submissions.map((item) => {
      if (item.id === selectedSubmission.id) {
        return approvedItem;
      }
      return item;
    });

    saveSubmissions(updated);
    setSelectedSubmission(null);
    setIsReturnPromptOpen(false);
    showToast(`"${selectedSubmission.title}" approved! Digital Library Clearance Slip issued.`, 'success');
    openClearanceModal(approvedItem);
  };

  // Handle Return for Corrections
  const handleConfirmReturnForCorrections = () => {
    if (!selectedSubmission) return;

    const note = returnNote.trim() || 'Please comply with required thesis title page formatting and clearance sign-offs.';

    const updated = submissions.map((item) => {
      if (item.id === selectedSubmission.id) {
        return {
          ...item,
          status: 'returned' as ArchivalStatus,
          statusLabel: 'Returned for Corrections',
          returnRemarks: note
        };
      }
      return item;
    });

    saveSubmissions(updated);
    setSelectedSubmission(null);
    setIsReturnPromptOpen(false);
    setReturnNote('');
    showToast(`Submission returned for corrections to ${selectedSubmission.adviser}.`, 'info');
  };

  return (
    <LibraryShell
      activeNav="approval"
      title="Repository Approval"
      description="Inspect validated capstone manuscripts and approve completed research for formal archiving in the institutional repository"
    >
      <div className="library-approval-container">

        {/* Toast Notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '1.25rem',
              right: '1.25rem',
              zIndex: 9999,
              background: toast.type === 'success' ? '#065F46' : toast.type === 'warning' ? '#92400E' : '#003A8F',
              color: '#FFFFFF',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.65rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              fontSize: '0.86rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}
          >
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`} />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top 4 KPI Status Cards Grid (Pixel-aligned with screenshot) */}
        <section aria-label="Repository approval summary metrics" className="library-approval-kpi-grid">
          {/* 1. Pending Approval */}
          <article className="library-approval-kpi-card">
            <div className="library-approval-kpi-icon is-pending">
              <i className="fas fa-hourglass-half" aria-hidden="true" />
            </div>
            <div className="library-approval-kpi-body">
              <span className="library-approval-kpi-label">Pending Approval</span>
              <strong className="library-approval-kpi-value">{pendingCount}</strong>
              <span className="library-approval-kpi-sub">Validated by the Research Focal Person</span>
            </div>
          </article>

          {/* 2. Approved, To Archive */}
          <article className="library-approval-kpi-card">
            <div className="library-approval-kpi-icon is-ready">
              <i className="fas fa-check-circle" aria-hidden="true" />
            </div>
            <div className="library-approval-kpi-body">
              <span className="library-approval-kpi-label">Approved, To Archive</span>
              <strong className="library-approval-kpi-value">{toArchiveCount}</strong>
              <span className="library-approval-kpi-sub">Ready to store in the repository</span>
            </div>
          </article>

          {/* 3. Archived */}
          <article className="library-approval-kpi-card">
            <div className="library-approval-kpi-icon is-archived">
              <i className="fas fa-archive" aria-hidden="true" />
            </div>
            <div className="library-approval-kpi-body">
              <span className="library-approval-kpi-label">Archived</span>
              <strong className="library-approval-kpi-value">{archivedCount}</strong>
              <span className="library-approval-kpi-sub">In the official repository</span>
            </div>
          </article>

          {/* 4. Returned */}
          <article className="library-approval-kpi-card">
            <div className="library-approval-kpi-icon is-returned">
              <i className="fas fa-rotate-left" aria-hidden="true" />
            </div>
            <div className="library-approval-kpi-body">
              <span className="library-approval-kpi-label">Returned</span>
              <strong className="library-approval-kpi-value">{returnedCount}</strong>
              <span className="library-approval-kpi-sub">Waiting for the adviser</span>
            </div>
          </article>
        </section>

        {/* Filter Navigation and Search Row (Pixel-aligned with screenshot) */}
        <section aria-label="Approval filter toolbar" className="library-approval-filter-bar">
          <div className="library-approval-tabs-group" role="tablist">
            {/* Pending Approval Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pending'}
              className={`library-approval-tab-pill ${activeTab === 'pending' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <span>Pending Approval</span>
              <span className="library-approval-tab-count">{pendingCount}</span>
            </button>

            {/* Approved · To Archive Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'to-archive'}
              className={`library-approval-tab-pill ${activeTab === 'to-archive' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('to-archive')}
            >
              <span>Approved · To Archive</span>
              <span className="library-approval-tab-count">{toArchiveCount}</span>
            </button>

            {/* Archived Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'archived'}
              className={`library-approval-tab-pill ${activeTab === 'archived' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('archived')}
            >
              <span>Archived</span>
              <span className="library-approval-tab-count">{archivedCount}</span>
            </button>

            {/* Returned Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'returned'}
              className={`library-approval-tab-pill ${activeTab === 'returned' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('returned')}
            >
              <span>Returned</span>
              <span className="library-approval-tab-count">{returnedCount}</span>
            </button>

            {/* Live Database Toggle */}
            <button
              type="button"
              className={`library-approval-live-btn ${isLiveDatabase ? 'is-active' : ''}`}
              onClick={() => {
                setIsLiveDatabase(!isLiveDatabase);
                showToast(isLiveDatabase ? 'Switched to local verification workspace.' : 'Connected to live database synchronized feed.', 'info');
              }}
              title="Toggle synchronized live database queue"
            >
              <i className="fas fa-database" aria-hidden="true" />
              <span>Live Database</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="library-approval-search-wrap">
            <i className="fas fa-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search title, ID, or researcher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="library-approval-search-input"
              aria-label="Search title, ID, or researcher"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
                aria-label="Clear search"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </section>

        {/* Submissions List */}
        <section aria-label="Repository approval submissions list" className="library-approval-list">
          {filteredSubmissions.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '0.85rem',
                border: '1px dashed #CBD5E1',
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                color: '#64748B'
              }}
            >
              <i
                className="fas fa-folder-open"
                style={{ fontSize: '2.25rem', color: '#94A3B8', marginBottom: '0.75rem' }}
                aria-hidden="true"
              />
              <h3 style={{ margin: '0 0 0.35rem 0', fontWeight: 800, color: '#0F172A', fontSize: '1.1rem' }}>
                {activeTab === 'pending'
                  ? 'No submissions pending repository approval'
                  : activeTab === 'to-archive'
                  ? 'No studies currently queued to archive'
                  : activeTab === 'archived'
                  ? 'No archived studies found'
                  : 'No returned studies'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Try selecting a different status filter tab or clearing your search term.
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => (
              <article key={sub.id} className="library-approval-item-card">
                {/* Left Column: Title, Dept Tag, and Authors */}
                <div className="library-approval-item-left">
                  <h3 className="library-approval-item-title">{sub.title}</h3>
                  <div className="library-approval-item-meta">
                    <span className="library-approval-dept-tag">{sub.department}</span>
                    <span>
                      <strong>{sub.id}</strong> · {sub.authors.join(', ')} · Adviser: {sub.adviser}
                    </span>
                  </div>
                </div>

                {/* Center Column: Manuscript file, Requirements, Validation date */}
                <div className="library-approval-item-center">
                  <div className="library-approval-item-center-row">
                    <i className="fas fa-file-pdf" aria-hidden="true" />
                    <span>
                      <strong>{sub.manuscriptFile.name}</strong> · {sub.manuscriptFile.status}
                    </span>
                  </div>
                  <div className="library-approval-item-center-row">
                    <i className="fas fa-list-check" aria-hidden="true" />
                    <span>{sub.postDefenseRequirements.label}</span>
                  </div>
                  <div className="library-approval-item-center-row" style={{ color: '#64748B' }}>
                    <i className="fas fa-clock" aria-hidden="true" style={{ color: '#64748B' }} />
                    <span>{sub.validatedAt}</span>
                  </div>
                </div>

                {/* Right Column: Status pill and Review Button */}
                <div className="library-approval-item-right">
                  <span
                    className={`library-approval-status-pill ${
                      sub.status === 'archived'
                        ? 'is-archived'
                        : sub.status === 'returned'
                        ? 'is-returned'
                        : ''
                    }`}
                  >
                    {sub.status === 'archived' && <i className="fas fa-check" />}
                    {sub.status === 'returned' && <i className="fas fa-rotate-left" />}
                    <span>{sub.statusLabel}</span>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {sub.status === 'archived' && (
                      <button
                        type="button"
                        className="library-approval-clearance-btn"
                        onClick={() => openClearanceModal(sub)}
                        title="View & Print Digital Library Clearance Slip"
                      >
                        <i className="fas fa-certificate" aria-hidden="true" />
                        <span>Clearance Slip</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="library-approval-review-btn"
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setIsReturnPromptOpen(false);
                        setReturnNote('');
                      }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        {/* Bottom Notice Banner (Pixel-aligned with screenshot) */}
        <div className="library-approval-notice-banner" role="note">
          <i className="fas fa-info-circle" aria-hidden="true" />
          <span>
            Validated projects come from the validation workflow, which still runs on sample data in this browser. Notices to advisers and research groups are recorded there, not delivered to real accounts yet.
          </span>
        </div>

      </div>

      {/* Review Modal Dialog (Modern Academic Repository Review) */}
      {selectedSubmission && typeof document !== 'undefined' && createPortal(
        <div
          className="library-approval-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="repository-review-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSubmission(null);
          }}
        >
          <div className="library-approval-modal-card">
            {/* Modal Header */}
            <div className="library-approval-modal-head">
              <div className="library-review-head-left">
                <div className="library-review-head-icon">
                  <i className="fas fa-clipboard-check" aria-hidden="true" />
                </div>
                <div className="library-review-head-title">
                  <h3 id="repository-review-title">Institutional Repository Review</h3>
                  <p>Accreditation &amp; Archival Clearance Verification</p>
                </div>
              </div>
              <div className="library-review-head-right">
                <span className="library-review-id-chip" title="Accession Reference ID">
                  <i className="fas fa-barcode" aria-hidden="true" />
                  {selectedSubmission.id}
                </span>
                <button
                  type="button"
                  className="library-approval-modal-close"
                  onClick={() => setSelectedSubmission(null)}
                  aria-label="Close review dialog"
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="library-approval-modal-body">
              {/* Project Title & Status Banner */}
              <div className="library-review-project-banner">
                <div className="library-review-badges-row">
                  <span className="library-approval-dept-tag">
                    {selectedSubmission.department}
                  </span>
                  <span className="library-browse-type-badge">
                    <i className="fas fa-shapes" aria-hidden="true" />
                    {selectedSubmission.projectType}
                  </span>
                  {selectedSubmission.callNumber && (
                    <span
                      style={{
                        fontSize: '0.76rem',
                        color: '#003A8F',
                        fontWeight: 700,
                        background: '#EFF6FF',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '0.4rem',
                        border: '1px solid #BFDBFE'
                      }}
                    >
                      <i className="fas fa-hashtag" aria-hidden="true" style={{ marginRight: '0.25rem' }} />
                      {selectedSubmission.callNumber}
                    </span>
                  )}
                  <span
                    className={`library-review-status-pill ${
                      selectedSubmission.status === 'archived'
                        ? 'is-archived'
                        : selectedSubmission.status === 'returned'
                        ? 'is-returned'
                        : 'is-pending'
                    }`}
                  >
                    {selectedSubmission.status === 'archived' && <i className="fas fa-check-circle" />}
                    {selectedSubmission.status === 'returned' && <i className="fas fa-rotate-left" />}
                    {selectedSubmission.status === 'pending' && <i className="fas fa-clock" />}
                    <span>{selectedSubmission.statusLabel}</span>
                  </span>
                </div>

                <h4 className="library-review-project-title">
                  {selectedSubmission.title}
                </h4>
              </div>

              {/* Visual Archival Workflow Stepper */}
              <div className="library-review-stepper-box">
                <div className="library-review-stepper-header">
                  <span className="library-review-stepper-label">
                    <i className="fas fa-diagram-project" aria-hidden="true" />
                    Archival Accession Workflow
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                    Stage {selectedSubmission.status === 'archived' ? '4 of 4' : selectedSubmission.status === 'to-archive' ? '3 of 4' : selectedSubmission.status === 'pending' ? '2 of 4' : '1 of 4'}
                  </span>
                </div>

                <div className="library-review-stepper-track">
                  <div className="library-review-stepper-line" />

                  {/* Stage 1: Defense Validated */}
                  <div className="library-review-stepper-step is-done">
                    <div className="library-review-stepper-circle">
                      <i className="fas fa-check" />
                    </div>
                    <span className="library-review-stepper-step-title">Defense Validated</span>
                    <span className="library-review-stepper-step-desc">Panel sign-offs verified</span>
                  </div>

                  {/* Stage 2: Library Review */}
                  <div
                    className={`library-review-stepper-step ${
                      selectedSubmission.status === 'pending'
                        ? 'is-current'
                        : selectedSubmission.status === 'to-archive' || selectedSubmission.status === 'archived'
                        ? 'is-done'
                        : ''
                    }`}
                  >
                    <div className="library-review-stepper-circle">
                      {selectedSubmission.status === 'pending' ? (
                        <i className="fas fa-magnifying-glass" />
                      ) : selectedSubmission.status === 'to-archive' || selectedSubmission.status === 'archived' ? (
                        <i className="fas fa-check" />
                      ) : (
                        '2'
                      )}
                    </div>
                    <span className="library-review-stepper-step-title">Library Review</span>
                    <span className="library-review-stepper-step-desc">
                      {selectedSubmission.status === 'pending' ? 'In verification' : 'Verified'}
                    </span>
                  </div>

                  {/* Stage 3: Clearance Issued */}
                  <div
                    className={`library-review-stepper-step ${
                      selectedSubmission.status === 'to-archive'
                        ? 'is-current'
                        : selectedSubmission.status === 'archived'
                        ? 'is-done'
                        : ''
                    }`}
                  >
                    <div className="library-review-stepper-circle">
                      {selectedSubmission.status === 'archived' ? (
                        <i className="fas fa-check" />
                      ) : selectedSubmission.status === 'to-archive' ? (
                        <i className="fas fa-stamp" />
                      ) : (
                        '3'
                      )}
                    </div>
                    <span className="library-review-stepper-step-title">Clearance Issued</span>
                    <span className="library-review-stepper-step-desc">Digital slip generated</span>
                  </div>

                  {/* Stage 4: Cataloged in Repository */}
                  <div
                    className={`library-review-stepper-step ${
                      selectedSubmission.status === 'archived' ? 'is-done' : ''
                    }`}
                  >
                    <div className="library-review-stepper-circle">
                      {selectedSubmission.status === 'archived' ? (
                        <i className="fas fa-landmark" />
                      ) : (
                        '4'
                      )}
                    </div>
                    <span className="library-review-stepper-step-title">Archived</span>
                    <span className="library-review-stepper-step-desc">Repository cataloged</span>
                  </div>
                </div>
              </div>

              {/* 4-Card Metadata Grid */}
              <div className="library-review-info-grid">
                {/* 1. Research Group */}
                <div className="library-review-info-card">
                  <div className="library-review-info-icon">
                    <i className="fas fa-users" aria-hidden="true" />
                  </div>
                  <div className="library-review-info-content">
                    <span className="library-review-info-label">Research Group</span>
                    <span className="library-review-info-value">{selectedSubmission.authors.join(', ')}</span>
                    <span className="library-review-info-sub">{selectedSubmission.authors.length} student contributors</span>
                  </div>
                </div>

                {/* 2. Adviser */}
                <div className="library-review-info-card">
                  <div className="library-review-info-icon">
                    <i className="fas fa-user-tie" aria-hidden="true" />
                  </div>
                  <div className="library-review-info-content">
                    <span className="library-review-info-label">Faculty Adviser</span>
                    <span className="library-review-info-value">{selectedSubmission.adviser}</span>
                    <span className="library-review-info-sub">Primary panel adviser</span>
                  </div>
                </div>

                {/* 3. Validated By */}
                <div className="library-review-info-card">
                  <div className="library-review-info-icon">
                    <i className="fas fa-user-check" style={{ color: '#16A34A' }} aria-hidden="true" />
                  </div>
                  <div className="library-review-info-content">
                    <span className="library-review-info-label">Focal Person Validation</span>
                    <span className="library-review-info-value">{selectedSubmission.validatedBy.split(' · ')[0]}</span>
                    <span className="library-review-info-sub">{selectedSubmission.validatedBy.split(' · ')[1] ?? selectedSubmission.validatedAt}</span>
                  </div>
                </div>

                {/* 4. Archived Manuscript Document */}
                <div className="library-review-info-card">
                  <div className="library-review-info-icon">
                    <i className="fas fa-file-pdf" style={{ color: '#DC2626' }} aria-hidden="true" />
                  </div>
                  <div className="library-review-info-content">
                    <span className="library-review-info-label">Archived Manuscript</span>
                    <span className="library-review-info-value" title={selectedSubmission.manuscriptFile.name}>
                      {selectedSubmission.manuscriptFile.name}
                    </span>
                    <span className="library-review-info-sub">
                      {selectedSubmission.manuscriptFile.size} • Verified PDF
                    </span>
                  </div>
                </div>
              </div>

              {/* Post-Defense Requirements Checklist */}
              <div className="library-review-checklist-box">
                <div className="library-review-checklist-header">
                  <span className="library-review-checklist-title">
                    <i className="fas fa-shield-check" aria-hidden="true" />
                    Post-Defense Compliance &amp; Endorsement Sign-Offs
                  </span>
                  <span className="library-review-compliance-badge">
                    <i className="fas fa-circle-check" aria-hidden="true" />
                    {selectedSubmission.postDefenseRequirements.completed} of{' '}
                    {selectedSubmission.postDefenseRequirements.total} Complied (100%)
                  </span>
                </div>

                <div className="library-review-checklist-grid">
                  {selectedSubmission.postDefenseRequirements.items.map((req, idx) => (
                    <div key={idx} className="library-review-checklist-item">
                      <div className="library-review-req-left">
                        <i className="far fa-file-lines" aria-hidden="true" />
                        <span className="library-review-req-text" title={req.name}>
                          {req.name}
                        </span>
                      </div>
                      <span className="library-review-req-badge">
                        <i className="fas fa-check" aria-hidden="true" />
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Callouts: Abstract & Validation Remarks */}
              <div className="library-review-callouts-group">
                {/* Abstract */}
                <div className="library-review-callout is-abstract">
                  <span className="library-review-callout-label">
                    <i className="fas fa-align-left" aria-hidden="true" />
                    Abstract Summary
                  </span>
                  <p className="library-review-callout-text">{selectedSubmission.abstract}</p>
                  {selectedSubmission.keywords && (
                    <div className="library-review-keywords-row">
                      {selectedSubmission.keywords.split(',').map((kw) => (
                        <span key={kw.trim()} className="library-review-keyword-pill">
                          #{kw.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Validation Notes */}
                <div className="library-review-callout is-notes">
                  <span className="library-review-callout-label">
                    <i className="fas fa-note-sticky" aria-hidden="true" />
                    Focal Person Remarks
                  </span>
                  <p className="library-review-callout-text">{selectedSubmission.validationNotes}</p>
                </div>
              </div>

              {/* If Librarian clicked Return for Corrections */}
              {isReturnPromptOpen && (
                <div className="library-review-return-box">
                  <h5 className="library-review-return-title">
                    <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                    Specify Return Remarks for Adviser &amp; Research Group
                  </h5>
                  <div className="library-review-return-presets">
                    <button
                      type="button"
                      className="library-review-preset-btn"
                      onClick={() => setReturnNote('Please comply with required thesis title page formatting and clearance sign-offs.')}
                    >
                      Format Compliance
                    </button>
                    <button
                      type="button"
                      className="library-review-preset-btn"
                      onClick={() => setReturnNote('Missing faculty panel endorsement signature on page 3 approval sheet.')}
                    >
                      Missing Signature
                    </button>
                    <button
                      type="button"
                      className="library-review-preset-btn"
                      onClick={() => setReturnNote('Supplementary hardware documentation / test report file incomplete.')}
                    >
                      Supplementary Data
                    </button>
                  </div>
                  <textarea
                    id="corrections-remarks"
                    rows={3}
                    placeholder="Provide specific instructions for the adviser and student authors..."
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    className="library-review-return-textarea"
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className="library-review-btn-close"
                      style={{ height: '34px', padding: '0 0.85rem', fontSize: '0.8rem' }}
                      onClick={() => setIsReturnPromptOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="library-review-btn-return"
                      style={{ height: '34px', padding: '0 0.95rem', fontSize: '0.8rem' }}
                      onClick={handleConfirmReturnForCorrections}
                    >
                      <i className="fas fa-paper-plane" /> Confirm Return
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="library-review-modal-footer">
              <div className="library-review-footer-status">
                <i className="fas fa-shield-halved" style={{ color: '#003A8F' }} aria-hidden="true" />
                <span>
                  Accession Call No:{' '}
                  <strong>
                    {selectedSubmission.callNumber || `LIB-2026-${selectedSubmission.department.replace('BS', '')}-${selectedSubmission.id.split('-').pop() || '014'}`}
                  </strong>
                </span>
              </div>

              <div className="library-review-footer-actions">
                <button
                  type="button"
                  className="library-review-btn-close"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Close
                </button>

                {selectedSubmission.status === 'archived' && (
                  <button
                    type="button"
                    className="library-review-btn-clearance"
                    onClick={() => {
                      const current = selectedSubmission;
                      setSelectedSubmission(null);
                      openClearanceModal(current);
                    }}
                    title="View &amp; Print Official Digital Library Clearance Slip"
                  >
                    <i className="fas fa-certificate" aria-hidden="true" />
                    <span>View Clearance Slip</span>
                  </button>
                )}

                {!isReturnPromptOpen && selectedSubmission.status !== 'archived' && (
                  <>
                    <button
                      type="button"
                      className="library-review-btn-return"
                      onClick={() => setIsReturnPromptOpen(true)}
                    >
                      <i className="fas fa-rotate-left" aria-hidden="true" />
                      <span>Return for Corrections</span>
                    </button>

                    <button
                      type="button"
                      className="library-review-btn-approve"
                      onClick={handleApproveForRepository}
                    >
                      <i className="fas fa-check-circle" aria-hidden="true" />
                      <span>Approve for Repository</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Digital Library Clearance Slip Modal */}
      {clearanceModalData && (
        <LibraryClearanceSlipModal
          clearance={clearanceModalData}
          onClose={() => setClearanceModalData(null)}
        />
      )}
    </LibraryShell>
  );
}
