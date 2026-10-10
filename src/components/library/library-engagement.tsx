'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  LIBRARY_PROJECTS,
  type LibraryDepartment,
  type LibraryProject,
  getDepartmentLabel,
  getProjectIcon
} from '@/components/library/library-data';
import { LibraryShell } from '@/components/library/library-shell';

export type ViewerRole =
  | 'Student Reader'
  | 'Faculty / Researcher'
  | 'Industry Partner'
  | 'Guest Reader';

export type CommentIntent =
  | 'Research Inquiry'
  | 'Industry Interest'
  | 'Citation Request'
  | 'Methodology Feedback'
  | 'General Praise';

export type ViewerComment = {
  id: string;
  projectId: number;
  authorName: string;
  authorRole: ViewerRole;
  affiliation?: string;
  intent: CommentIntent;
  body: string;
  createdAt: string;
  librarianReply?: {
    authorName: string;
    body: string;
    repliedAt: string;
  };
};

const DEFAULT_VIEWER_COMMENTS: ViewerComment[] = [
  {
    id: 'vc-1',
    projectId: 1,
    authorName: 'Marc A. Velasco',
    authorRole: 'Student Reader',
    affiliation: '4th Year BSIT',
    intent: 'Research Inquiry',
    body: 'We are currently developing our senior capstone on adaptive student learning. Could our group reference your methodology on predictive risk intervention? The 25% improvement rate was remarkable and very inspiring!',
    createdAt: '2024-03-18T10:30:00Z',
    librarianReply: {
      authorName: 'Elena Santos (University Librarian)',
      body: 'Hello Marc! Yes, this thesis is published under open campus access. You can find the full methodology in Chapter 3 and cite it using the formal citation format on the project page.',
      repliedAt: '2024-03-19T09:15:00Z'
    }
  },
  {
    id: 'vc-2',
    projectId: 1,
    authorName: 'Engr. Dennis Mendoza',
    authorRole: 'Faculty / Researcher',
    affiliation: 'College of Information Computing',
    intent: 'Methodology Feedback',
    body: 'Comprehensive statistical validation on the 200 pilot students. Has the machine learning model weights file or repository archive been cataloged for reproducibility?',
    createdAt: '2024-03-22T14:45:00Z',
    librarianReply: {
      authorName: 'Elena Santos (University Librarian)',
      body: 'Yes, Engr. Mendoza. Model configurations and synthetic training datasets are cataloged in the Supplementary Data archive (Call No. LIB-2024-IT-001).',
      repliedAt: '2024-03-23T11:00:00Z'
    }
  },
  {
    id: 'vc-3',
    projectId: 1,
    authorName: 'Northbridge Logistics Tech Corp.',
    authorRole: 'Industry Partner',
    affiliation: 'Corporate Innovation Partner',
    intent: 'Industry Interest',
    body: 'We reviewed the pilot deployment metrics showing a 40% reduction in stockouts. Our engineering team is very interested in discussing a technology transfer and internship trial with the university.',
    createdAt: '2024-04-05T16:20:00Z'
  },
  {
    id: 'vc-4',
    projectId: 2,
    authorName: 'Christian Flores',
    authorRole: 'Student Reader',
    affiliation: '3rd Year MET',
    intent: 'Research Inquiry',
    body: 'The ESP32 microcontroller sensor wiring diagram and charge controller specs in Chapter 3 were extremely clear and helpful for our renewable energy design project. Thank you for publishing this!',
    createdAt: '2024-04-12T09:10:00Z',
    librarianReply: {
      authorName: 'Elena Santos (University Librarian)',
      body: 'Glad it helped Christian! The full physical schematic is also available for viewing in the engineering thesis archive room.',
      repliedAt: '2024-04-12T14:30:00Z'
    }
  },
  {
    id: 'vc-5',
    projectId: 2,
    authorName: 'GreenVolt Solar Solutions',
    authorRole: 'Industry Partner',
    affiliation: 'Renewable Energy Partner',
    intent: 'Industry Interest',
    body: 'Interested in the real-time efficiency monitoring firmware. Would the authors or faculty adviser be available for an industry coordination inquiry regarding solar array monitoring?',
    createdAt: '2024-04-20T11:40:00Z'
  },
  {
    id: 'vc-6',
    projectId: 3,
    authorName: 'Dr. Sarah Cruz',
    authorRole: 'Faculty / Researcher',
    affiliation: 'Department of Health Sciences',
    intent: 'Citation Request',
    body: 'The botanical classification and pharmacological evidence references are very well organized. This serves as an excellent benchmark for future ethnobotanical studies in the region.',
    createdAt: '2023-11-28T15:25:00Z'
  },
  {
    id: 'vc-7',
    projectId: 5,
    authorName: 'Capt. Arthur Lim',
    authorRole: 'Guest Reader',
    affiliation: 'Naval Architecture Alumni / Maritime Industry',
    intent: 'General Praise',
    body: 'Outstanding engineering work on the waterproof casing and turbidity sensor integration. Practical, low-cost innovation that addresses real coastal pollution detection challenges.',
    createdAt: '2023-12-14T13:10:00Z'
  },
  {
    id: 'vc-8',
    projectId: 7,
    authorName: 'Engr. Ramon Bautista',
    authorRole: 'Faculty / Researcher',
    affiliation: 'Campus Facilities & Utilities',
    intent: 'Industry Interest',
    body: 'We are reviewing this completed capstone for possible campus-wide smart charging point adoption near Building C. Excellent documentation of the contactor relay safety mechanisms.',
    createdAt: '2024-02-24T10:05:00Z'
  },
  {
    id: 'vc-9',
    projectId: 9,
    authorName: 'Paolo Del Rosario',
    authorRole: 'Student Reader',
    affiliation: '3rd Year BSIT',
    intent: 'Research Inquiry',
    body: 'The UI workflow diagrams for title submission and panel defense scheduling gave our project team great architectural inspiration. Kudos to the graduating authors!',
    createdAt: '2023-10-25T14:50:00Z'
  }
];

const DEPARTMENTS: Array<{ key: 'all' | LibraryDepartment; label: string }> = [
  { key: 'all', label: 'All Departments' },
  { key: 'IT', label: 'IT' },
  { key: 'MET', label: 'MET' },
  { key: 'TCM', label: 'TCM' },
  { key: 'ESM', label: 'ESM' },
  { key: 'NAME', label: 'NAME' }
];

function getDeptPillClass(dept: LibraryDepartment): string {
  switch (dept) {
    case 'IT':
      return 'is-it';
    case 'MET':
      return 'is-met';
    case 'TCM':
      return 'is-tcm';
    case 'ESM':
      return 'is-esm';
    case 'NAME':
      return 'is-name';
    default:
      return 'is-it';
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAvatarClass(role: ViewerRole): string {
  switch (role) {
    case 'Student Reader':
      return 'is-student';
    case 'Faculty / Researcher':
      return 'is-faculty';
    case 'Industry Partner':
      return 'is-industry';
    case 'Guest Reader':
    default:
      return 'is-guest';
  }
}

function getIntentBadgeStyle(intent: CommentIntent) {
  switch (intent) {
    case 'Industry Interest':
      return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' };
    case 'Research Inquiry':
      return { background: '#EFF6FF', color: '#003A8F', border: '1px solid #BFDBFE' };
    case 'Citation Request':
      return { background: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' };
    case 'Methodology Feedback':
      return { background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' };
    case 'General Praise':
    default:
      return { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
  }
}

export function LibraryEngagement() {
  const [comments, setComments] = useState<ViewerComment[]>(() => {
    try {
      const stored = localStorage.getItem('thesistrack_viewer_comments');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_VIEWER_COMMENTS;
  });

  const [departmentFilter, setDepartmentFilter] = useState<'all' | LibraryDepartment>('all');
  const [viewerRoleFilter, setViewerRoleFilter] = useState<'all' | ViewerRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasCommentsOnly, setHasCommentsOnly] = useState(false);
  const [activeStudyId, setActiveStudyId] = useState<number>(1);
  const [viewTab, setViewTab] = useState<'study-hub' | 'all-comments-feed'>('study-hub');

  // Replying state
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  // Persist comments
  const saveComments = useCallback((updated: ViewerComment[]) => {
    setComments(updated);
    try {
      localStorage.setItem('thesistrack_viewer_comments', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }, []);

  // Comments mapped by project ID
  const commentsByProject = useMemo(() => {
    const map = new Map<number, ViewerComment[]>();
    for (const comment of comments) {
      const numId = Number(comment.projectId);
      const list = map.get(numId) || [];
      list.push(comment);
      map.set(numId, list);
    }
    return map;
  }, [comments]);

  // Filtered studies
  const filteredStudies = useMemo(() => {
    return LIBRARY_PROJECTS.filter((project) => {
      if (departmentFilter !== 'all' && project.department !== departmentFilter) {
        return false;
      }
      if (hasCommentsOnly) {
        const count = (commentsByProject.get(project.id) || []).length;
        if (count === 0) return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const projectComments = commentsByProject.get(project.id) || [];
        const matchesComment = projectComments.some(
          (c) =>
            c.body.toLowerCase().includes(q) ||
            c.authorName.toLowerCase().includes(q) ||
            (c.affiliation && c.affiliation.toLowerCase().includes(q))
        );
        return (
          project.title.toLowerCase().includes(q) ||
          project.authors.join(' ').toLowerCase().includes(q) ||
          project.adviser.toLowerCase().includes(q) ||
          matchesComment
        );
      }
      return true;
    });
  }, [departmentFilter, hasCommentsOnly, searchQuery, commentsByProject]);

  // Active study selected
  const activeStudy = useMemo(() => {
    return (
      LIBRARY_PROJECTS.find((p) => p.id === activeStudyId) ||
      filteredStudies[0] ||
      LIBRARY_PROJECTS[0]
    );
  }, [activeStudyId, filteredStudies]);

  // Comments for the active study (filtered by viewer role if set)
  const activeStudyComments = useMemo(() => {
    const list = commentsByProject.get(activeStudy.id) || [];
    return list
      .filter((c) => viewerRoleFilter === 'all' || c.authorRole === viewerRoleFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [commentsByProject, activeStudy.id, viewerRoleFilter]);

  // Total stats
  const totalViews = useMemo(() => {
    return LIBRARY_PROJECTS.reduce((acc, p) => acc + p.views, 0);
  }, []);

  const totalViewerCommentsCount = useMemo(() => comments.length, [comments]);

  function handleAddLibrarianReply(commentId: string) {
    if (!replyDraft.trim()) return;

    const updated = comments.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          librarianReply: {
            authorName: 'Elena Santos (University Librarian)',
            body: replyDraft.trim(),
            repliedAt: new Date().toISOString()
          }
        };
      }
      return comment;
    });

    saveComments(updated);
    setReplyDraft('');
    setReplyingCommentId(null);
  }

  function handleDeleteComment(commentId: string) {
    saveComments(comments.filter((c) => c.id !== commentId));
  }

  return (
    <LibraryShell
      activeNav="engagement"
      title="Views & Comments"
      description="Monitor viewer readership and review feedback from students, faculty, and industry partners on published research"
    >
      <div className="library-engagement-container">

        {/* Top Hero Summary Bar */}
        <div className="library-repo-hero">
          <div className="library-repo-hero-text">
            <h1>
              <i className="fas fa-comments" style={{ color: '#003A8F' }} aria-hidden="true" />
              Published Research: Views & Viewer Comments
            </h1>
            <p>
              Review comments, citation requests, and inquiries left by campus and public viewers on completed capstones and theses.
            </p>
          </div>
          <div className="library-repo-hero-actions">
            <span className="library-browse-stat-pill is-primary">
              <i className="fas fa-eye" aria-hidden="true" />
              {totalViews.toLocaleString()} Total Reads
            </span>
            <span className="library-browse-stat-pill is-saved">
              <i className="fas fa-comment-dots" aria-hidden="true" />
              {totalViewerCommentsCount} Viewer Comments
            </span>
          </div>
        </div>

        {/* Quick Department Filter Tabs */}
        <div className="library-dept-tabs-bar" role="tablist" aria-label="Department filter tabs">
          {DEPARTMENTS.map((dept) => {
            const isActive = departmentFilter === dept.key;
            const count =
              dept.key === 'all'
                ? LIBRARY_PROJECTS.length
                : LIBRARY_PROJECTS.filter((p) => p.department === dept.key).length;

            return (
              <button
                key={dept.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`library-dept-tab-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => setDepartmentFilter(dept.key)}
              >
                <span>{dept.label}</span>
                <span className="library-dept-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Controls Toolbar */}
        <div className="library-browse-controls-card">
          <div className="library-browse-controls-row">

            {/* Search Input */}
            <div className="library-browse-search-wrapper">
              <i className="fas fa-search library-browse-search-icon" aria-hidden="true" />
              <input
                id="viewer-engagement-search"
                type="text"
                placeholder="Search published theses, authors, or viewer comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="library-browse-search-field"
                aria-label="Search research studies and comments"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="library-browse-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Viewer Role Filter */}
            <div className="library-browse-select-wrap">
              <i className="fas fa-user-tag library-browse-select-icon" aria-hidden="true" />
              <select
                id="viewer-role-filter"
                value={viewerRoleFilter}
                onChange={(e) => setViewerRoleFilter(e.target.value as 'all' | ViewerRole)}
                className="library-browse-select"
                aria-label="Filter by viewer type"
              >
                <option value="all">All Viewer Types</option>
                <option value="Student Reader">Student Readers</option>
                <option value="Faculty / Researcher">Faculty / Researchers</option>
                <option value="Industry Partner">Industry Partners</option>
                <option value="Guest Reader">Guest Readers</option>
              </select>
              <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
            </div>

            {/* Has Comments Only Toggle */}
            <button
              type="button"
              className={`library-browse-saved-toggle ${hasCommentsOnly ? 'is-active' : ''}`}
              onClick={() => setHasCommentsOnly(!hasCommentsOnly)}
              title="Show only studies that have viewer comments"
            >
              <i className="fas fa-comment-dots" aria-hidden="true" />
              <span>With Comments Only</span>
            </button>

            {/* View Switcher: By Study vs All Comments Feed */}
            <div className="library-browse-view-switch" role="group" aria-label="View toggle">
              <button
                type="button"
                className={`library-browse-view-btn ${viewTab === 'study-hub' ? 'is-active' : ''}`}
                onClick={() => setViewTab('study-hub')}
              >
                <i className="fas fa-columns" aria-hidden="true" />
                <span>By Published Research</span>
              </button>
              <button
                type="button"
                className={`library-browse-view-btn ${viewTab === 'all-comments-feed' ? 'is-active' : ''}`}
                onClick={() => setViewTab('all-comments-feed')}
              >
                <i className="fas fa-list-ul" aria-hidden="true" />
                <span>All Viewer Feed</span>
              </button>
            </div>

          </div>
        </div>

        {/* View Mode 1: Split Master-Detail Layout */}
        {viewTab === 'study-hub' ? (
          <div className="library-engagement-split">

            {/* Left Column: Published & Finished Research Studies */}
            <div className="library-engagement-list-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Published Research ({filteredStudies.length})
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Select to see viewer comments
                </span>
              </div>

              {filteredStudies.length === 0 ? (
                <div className="library-browse-empty-state" style={{ padding: '3rem 1.5rem' }}>
                  <i className="fas fa-search" style={{ fontSize: '2rem', color: '#94A3B8' }} aria-hidden="true" />
                  <p style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>No matching published studies</p>
                  <button
                    type="button"
                    className="library-active-chip-clear-all"
                    onClick={() => {
                      setSearchQuery('');
                      setDepartmentFilter('all');
                      setHasCommentsOnly(false);
                      setViewerRoleFilter('all');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredStudies.map((study) => {
                  const isSelected = study.id === activeStudy.id;
                  const studyComments = commentsByProject.get(study.id) || [];
                  const deptPillClass = getDeptPillClass(study.department);

                  return (
                    <article
                      key={study.id}
                      className={`library-engagement-study-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setActiveStudyId(study.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setActiveStudyId(study.id);
                        }
                      }}
                    >
                      <div className="library-engagement-study-head">
                        <span className={`library-dept-pill ${deptPillClass}`}>
                          {study.department}
                        </span>
                        <span className="library-published-status-badge">
                          <i className="fas fa-check-circle" aria-hidden="true" />
                          Published {study.year}
                        </span>
                      </div>

                      <h3 className="library-engagement-study-title">
                        {study.title}
                      </h3>

                      <div className="library-engagement-study-meta">
                        <span>{study.authorsShort || study.authors[0]}</span>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span>Adviser: {study.adviser}</span>
                      </div>

                      <div className="library-engagement-study-footer">
                        <span className={`library-engagement-comment-pill ${studyComments.length === 0 ? 'has-none' : ''}`}>
                          <i className="fas fa-comment-dots" aria-hidden="true" />
                          {studyComments.length} {studyComments.length === 1 ? 'Viewer Comment' : 'Viewer Comments'}
                        </span>
                        <span className="library-browse-card-views">
                          <i className="fas fa-eye" aria-hidden="true" />
                          {study.views.toLocaleString()} reads
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Right Column: Active Study Viewer Comments & Engagement Hub */}
            <div className="library-engagement-hub-panel">

              {/* Study Header */}
              <div className="library-engagement-hub-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`library-dept-pill ${getDeptPillClass(activeStudy.department)}`}>
                    {activeStudy.department} - {getDepartmentLabel(activeStudy.department)}
                  </span>
                  <span className="library-published-status-badge">
                    <i className="fas fa-award" aria-hidden="true" />
                    Published & Cataloged {activeStudy.year}
                  </span>
                  <span className="library-browse-type-badge">
                    <i className={`fas ${getProjectIcon(activeStudy.type)}`} aria-hidden="true" />
                    {activeStudy.type}
                  </span>
                  <Link
                    href={`/library/project-details?id=${activeStudy.id}`}
                    style={{ marginLeft: 'auto', textDecoration: 'none', color: '#003A8F', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span>View Published Record</span>
                    <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
                  </Link>
                </div>

                <h2 className="library-engagement-hub-title">
                  {activeStudy.title}
                </h2>

                <div style={{ fontSize: '0.88rem', color: '#64748B' }}>
                  <strong>Authors:</strong> {activeStudy.authors.join(', ')} <span style={{ margin: '0 0.4rem', color: '#CBD5E1' }}>•</span>
                  <strong>Adviser:</strong> {activeStudy.adviser}
                </div>
              </div>

              {/* Readership Stats */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.6rem' }}>
                  Viewer Engagement Overview
                </span>
                <div className="library-engagement-views-strip">
                  <div className="library-engagement-view-box">
                    <span>Total Views</span>
                    <strong>{activeStudy.views.toLocaleString()}</strong>
                  </div>
                  <div className="library-engagement-view-box">
                    <span>Student / Faculty</span>
                    <strong style={{ color: '#003A8F' }}>{Math.round(activeStudy.views * 0.72).toLocaleString()}</strong>
                  </div>
                  <div className="library-engagement-view-box">
                    <span>Guest / Public</span>
                    <strong style={{ color: '#D97706' }}>{Math.round(activeStudy.views * 0.28).toLocaleString()}</strong>
                  </div>
                  <div className="library-engagement-view-box">
                    <span>Viewer Comments</span>
                    <strong style={{ color: '#059669' }}>{activeStudyComments.length}</strong>
                  </div>
                </div>
              </div>

              {/* Viewer Comments Section */}
              <div className="library-comments-thread">
                <div className="library-comments-thread-head">
                  <h3>
                    <i className="fas fa-comments" style={{ color: '#003A8F' }} aria-hidden="true" />
                    <span>Comments From Readers & Viewers ({activeStudyComments.length})</span>
                  </h3>
                  {viewerRoleFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setViewerRoleFilter('all')}
                      style={{ background: 'none', border: 'none', color: '#003A8F', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Show All Types
                    </button>
                  )}
                </div>

                {/* List of comments for this study */}
                {activeStudyComments.length === 0 ? (
                  <div style={{ padding: '3rem 1.5rem', background: '#F8FAFC', borderRadius: '1rem', border: '1px dashed #CBD5E1', textAlign: 'center' }}>
                    <i className="fas fa-comment-slash" style={{ fontSize: '2rem', color: '#94A3B8', marginBottom: '0.5rem' }} aria-hidden="true" />
                    <p style={{ margin: '0 0 0.3rem 0', fontWeight: 700, color: '#0F172A' }}>No viewer comments on this research yet</p>
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                      When campus readers, student peers, faculty, or industry partners view this published study and leave feedback, it will appear here.
                    </span>
                  </div>
                ) : (
                  <div className="library-comments-thread-list">
                    {activeStudyComments.map((comment) => (
                      <div key={comment.id} className="library-comment-card">
                        
                        {/* Avatar */}
                        <div className={`library-comment-avatar ${getAvatarClass(comment.authorRole)}`}>
                          {comment.authorName.charAt(0)}
                        </div>

                        {/* Content */}
                        <div className="library-comment-body">
                          <div className="library-comment-meta-row">
                            <span className="library-comment-author-name">
                              {comment.authorName}
                              <span className={`library-comment-role-badge ${getAvatarClass(comment.authorRole)}`}>
                                {comment.authorRole}
                              </span>
                              {comment.affiliation && (
                                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                                  ({comment.affiliation})
                                </span>
                              )}
                              <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, ...getIntentBadgeStyle(comment.intent) }}>
                                {comment.intent}
                              </span>
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                {formatDate(comment.createdAt)}
                              </span>
                              <button
                                type="button"
                                className="library-comment-delete-btn"
                                onClick={() => handleDeleteComment(comment.id)}
                                title="Remove viewer comment"
                              >
                                <i className="fas fa-trash-can" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <p className="library-comment-text">
                            {comment.body}
                          </p>

                          {/* Existing Librarian Official Reply */}
                          {comment.librarianReply && (
                            <div className="library-comment-reply-box">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                <span style={{ fontWeight: 800, color: '#003A8F', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <i className="fas fa-reply" aria-hidden="true" />
                                  {comment.librarianReply.authorName}
                                </span>
                                <span style={{ color: '#64748B' }}>
                                  {formatDate(comment.librarianReply.repliedAt)}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E3A8A', lineHeight: 1.5 }}>
                                {comment.librarianReply.body}
                              </p>
                            </div>
                          )}

                          {/* Librarian Reply Action / Form */}
                          {!comment.librarianReply && (
                            <div style={{ marginTop: '0.4rem' }}>
                              {replyingCommentId === comment.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', background: '#EFF6FF', padding: '0.75rem', borderRadius: '0.65rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#003A8F' }}>
                                    Reply as University Librarian:
                                  </span>
                                  <textarea
                                    rows={2}
                                    placeholder="Write an official response or repository clarification to this viewer..."
                                    value={replyDraft}
                                    onChange={(e) => setReplyDraft(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid #BFDBFE', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button
                                      type="button"
                                      className="library-browse-quick-btn"
                                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                      onClick={() => {
                                        setReplyingCommentId(null);
                                        setReplyDraft('');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="library-comment-post-btn"
                                      style={{ padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}
                                      disabled={!replyDraft.trim()}
                                      onClick={() => handleAddLibrarianReply(comment.id)}
                                    >
                                      Send Official Reply
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setReplyingCommentId(comment.id)}
                                  style={{ background: 'none', border: 'none', padding: 0, color: '#003A8F', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <i className="fas fa-reply" aria-hidden="true" />
                                  <span>Reply to Viewer</span>
                                </button>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>
        ) : (

          /* View Mode 2: Master All Viewer Comments Feed Across Published Research */
          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.75rem', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0, 58, 143, 0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                  Viewer Feedback on Published Theses & Capstones
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748B', fontSize: '0.85rem' }}>
                  Live stream of questions, citation requests, and industry interest from campus and public readers.
                </p>
              </div>
              <span className="library-browse-stat-pill is-primary">
                {comments.length} Total Viewer Comments
              </span>
            </div>

            <div className="library-comments-thread-list">
              {comments.map((comment) => {
                const targetProject = LIBRARY_PROJECTS.find((p) => p.id === Number(comment.projectId));

                return (
                  <div key={comment.id} className="library-comment-card" style={{ background: 'white', border: '1.5px solid #F1F5F9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div className={`library-comment-avatar ${getAvatarClass(comment.authorRole)}`}>
                      {comment.authorName.charAt(0)}
                    </div>

                    <div className="library-comment-body">
                      {targetProject && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStudyId(targetProject.id);
                              setViewTab('study-hub');
                            }}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#003A8F', fontWeight: 800, fontSize: '0.92rem', textAlign: 'left', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            <i className="fas fa-book-bookmark" style={{ marginRight: '0.35rem' }} aria-hidden="true" />
                            {targetProject.title}
                          </button>
                          <span className="library-published-status-badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                            Published {targetProject.year}
                          </span>
                        </div>
                      )}

                      <div className="library-comment-meta-row">
                        <span className="library-comment-author-name">
                          {comment.authorName}
                          <span className={`library-comment-role-badge ${getAvatarClass(comment.authorRole)}`}>
                            {comment.authorRole}
                          </span>
                          {comment.affiliation && (
                            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                              ({comment.affiliation})
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, ...getIntentBadgeStyle(comment.intent) }}>
                            {comment.intent}
                          </span>
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            {formatDate(comment.createdAt)}
                          </span>
                          <button
                            type="button"
                            className="library-comment-delete-btn"
                            onClick={() => handleDeleteComment(comment.id)}
                            title="Remove viewer comment"
                          >
                            <i className="fas fa-trash-can" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <p className="library-comment-text">
                        {comment.body}
                      </p>

                      {comment.librarianReply && (
                        <div className="library-comment-reply-box">
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#003A8F' }}>
                            Librarian Response ({formatDate(comment.librarianReply.repliedAt)}):
                          </span>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E3A8A', lineHeight: 1.5 }}>
                            {comment.librarianReply.body}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </LibraryShell>
  );
}
