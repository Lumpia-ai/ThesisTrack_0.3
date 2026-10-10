'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LIBRARY_PROJECTS,
  type LibraryDepartment,
  type LibraryProject,
  getDepartmentLabel,
  getProjectIcon
} from '@/components/library/library-data';
import { LibraryShell } from '@/components/library/library-shell';

export type StudyComment = {
  id: string;
  projectId: number | string;
  authorName: string;
  authorRole: 'Librarian' | 'Adviser' | 'Panel Chair' | 'Student';
  category?: string;
  body: string;
  createdAt: string;
};

const DEFAULT_COMMENTS: StudyComment[] = [
  {
    id: 'c-1',
    projectId: 1,
    authorName: 'Elena Santos',
    authorRole: 'Librarian',
    category: 'Archive Record',
    body: 'Hardbound manuscript received and cataloged in the university thesis archives (Call No. QA76.76.L36 2024). Digital copy indexed for open campus repository access.',
    createdAt: '2024-03-15T09:30:00Z'
  },
  {
    id: 'c-2',
    projectId: 1,
    authorName: 'Dr. Ricardo Cruz',
    authorRole: 'Adviser',
    category: 'Final Review',
    body: 'All panel defense revisions regarding the predictive analytics algorithm and data ethics disclosure have been satisfied.',
    createdAt: '2024-03-10T14:15:00Z'
  },
  {
    id: 'c-3',
    projectId: 1,
    authorName: 'Prof. Maria Ramos',
    authorRole: 'Panel Chair',
    category: 'Clearance',
    body: 'Clearance approved. The system demo and source code repository links are archived in the appendix.',
    createdAt: '2024-03-12T11:00:00Z'
  },
  {
    id: 'c-4',
    projectId: 2,
    authorName: 'Elena Santos',
    authorRole: 'Librarian',
    category: 'Archive Record',
    body: 'Physical prototype blueprints and ESP32 schematic diagram verified and appended to the manuscript archive.',
    createdAt: '2024-04-02T10:45:00Z'
  },
  {
    id: 'c-5',
    projectId: 3,
    authorName: 'Dr. Anna Reyes',
    authorRole: 'Adviser',
    category: 'Cataloging Note',
    body: 'Herbal medicine formulation dataset has been validated by faculty researchers and cleared for public academic citation.',
    createdAt: '2023-11-20T16:20:00Z'
  },
  {
    id: 'c-6',
    projectId: 5,
    authorName: 'Elena Santos',
    authorRole: 'Librarian',
    category: 'Equipment Archive',
    body: 'Naval architecture water-tank test logs and drone calibration reports uploaded to supporting files.',
    createdAt: '2023-12-05T08:15:00Z'
  },
  {
    id: 'c-7',
    projectId: 7,
    authorName: 'Prof. Maria Ramos',
    authorRole: 'Panel Chair',
    category: 'Clearance',
    body: 'EV charging load-balancing results approved. Recommendation submitted for campus utility pilot deployment.',
    createdAt: '2024-02-18T13:40:00Z'
  },
  {
    id: 'c-8',
    projectId: 9,
    authorName: 'Elena Santos',
    authorRole: 'Librarian',
    category: 'Archive Record',
    body: 'Thesis tracking workflow manuscript indexed. Full PDF verified against institutional formatting guidelines.',
    createdAt: '2023-10-14T15:10:00Z'
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

function getAvatarClass(role: string): string {
  switch (role) {
    case 'Librarian':
      return 'is-librarian';
    case 'Adviser':
      return 'is-adviser';
    case 'Panel Chair':
      return 'is-panel';
    case 'Student':
    default:
      return 'is-student';
  }
}

export function LibraryEngagement() {
  const [comments, setComments] = useState<StudyComment[]>(() => {
    try {
      const stored = localStorage.getItem('thesistrack_library_comments');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_COMMENTS;
  });

  const [departmentFilter, setDepartmentFilter] = useState<'all' | LibraryDepartment>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasCommentsOnly, setHasCommentsOnly] = useState(false);
  const [activeStudyId, setActiveStudyId] = useState<number>(1);
  const [viewTab, setViewTab] = useState<'study-hub' | 'all-comments-feed'>('study-hub');

  // New comment composer state
  const [commentDraft, setCommentDraft] = useState('');
  const [commentRole, setCommentRole] = useState<'Librarian' | 'Adviser' | 'Panel Chair'>('Librarian');
  const [commentCategory, setCommentCategory] = useState('Archive Record');
  const [authorNameInput, setAuthorNameInput] = useState('University Librarian');

  // Sync to localStorage
  const saveComments = useCallback((updated: StudyComment[]) => {
    setComments(updated);
    try {
      localStorage.setItem('thesistrack_library_comments', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }, []);

  // Comments map by projectId
  const commentsByProject = useMemo(() => {
    const map = new Map<number, StudyComment[]>();
    for (const comment of comments) {
      const numId = Number(comment.projectId);
      const list = map.get(numId) || [];
      list.push(comment);
      map.set(numId, list);
    }
    return map;
  }, [comments]);

  // Filtered studies list
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
        const matchesComment = projectComments.some((c) => c.body.toLowerCase().includes(q) || c.authorName.toLowerCase().includes(q));
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

  // Currently active study
  const activeStudy = useMemo(() => {
    return (
      LIBRARY_PROJECTS.find((p) => p.id === activeStudyId) ||
      filteredStudies[0] ||
      LIBRARY_PROJECTS[0]
    );
  }, [activeStudyId, filteredStudies]);

  const activeStudyComments = useMemo(() => {
    return (commentsByProject.get(activeStudy.id) || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [commentsByProject, activeStudy.id]);

  // Overall Statistics
  const totalViews = useMemo(() => {
    return LIBRARY_PROJECTS.reduce((acc, p) => acc + p.views, 0);
  }, []);

  const totalSignedViews = useMemo(() => {
    return Math.round(totalViews * 0.68);
  }, [totalViews]);

  const totalGuestViews = useMemo(() => {
    return totalViews - totalSignedViews;
  }, [totalViews, totalSignedViews]);

  function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentDraft.trim()) return;

    const newComment: StudyComment = {
      id: `comment-${Date.now()}`,
      projectId: activeStudy.id,
      authorName: authorNameInput.trim() || 'University Librarian',
      authorRole: commentRole,
      category: commentCategory,
      body: commentDraft.trim(),
      createdAt: new Date().toISOString()
    };

    saveComments([newComment, ...comments]);
    setCommentDraft('');
  }

  function handleDeleteComment(commentId: string) {
    saveComments(comments.filter((c) => c.id !== commentId));
  }

  return (
    <LibraryShell
      activeNav="engagement"
      title="Views & Comments"
      description="Monitor research reads, analyze campus engagement, and manage librarian notes and comments"
    >
      <div className="library-engagement-container">

        {/* Top Hero Summary Bar */}
        <div className="library-repo-hero">
          <div className="library-repo-hero-text">
            <h1>
              <i className="fas fa-comments" style={{ color: '#003A8F' }} aria-hidden="true" />
              Research Views & Comments Hub
            </h1>
            <p>
              View detailed readership metrics and review feedback, archival remarks, and defense notes on all completed capstones.
            </p>
          </div>
          <div className="library-repo-hero-actions">
            <span className="library-browse-stat-pill is-primary">
              <i className="fas fa-eye" aria-hidden="true" />
              {totalViews.toLocaleString()} Total Reads
            </span>
            <span className="library-browse-stat-pill is-saved">
              <i className="fas fa-comment-dots" aria-hidden="true" />
              {comments.length} Comments Cataloged
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
                id="engagement-search"
                type="text"
                placeholder="Search studies, authors, or comment text..."
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

            {/* Department select */}
            <div className="library-browse-select-wrap">
              <i className="fas fa-building-columns library-browse-select-icon" aria-hidden="true" />
              <select
                id="engagement-department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value as 'all' | LibraryDepartment)}
                className="library-browse-select"
                aria-label="Filter by department"
              >
                <option value="all">All Departments</option>
                <option value="IT">IT - Information Tech</option>
                <option value="MET">MET - Manufacturing</option>
                <option value="TCM">TCM - Tech Comm</option>
                <option value="ESM">ESM - Engineering</option>
                <option value="NAME">NAME - Naval Architecture</option>
              </select>
              <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
            </div>

            {/* Has Comments Only Toggle */}
            <button
              type="button"
              className={`library-browse-saved-toggle ${hasCommentsOnly ? 'is-active' : ''}`}
              onClick={() => setHasCommentsOnly(!hasCommentsOnly)}
              title="Filter studies with comments"
            >
              <i className="fas fa-comment-dots" aria-hidden="true" />
              <span>Has Comments Only</span>
            </button>

            {/* Master View Switcher (By Study vs All Comments Feed) */}
            <div className="library-browse-view-switch" role="group" aria-label="View toggle">
              <button
                type="button"
                className={`library-browse-view-btn ${viewTab === 'study-hub' ? 'is-active' : ''}`}
                onClick={() => setViewTab('study-hub')}
              >
                <i className="fas fa-columns" aria-hidden="true" />
                <span>By Research</span>
              </button>
              <button
                type="button"
                className={`library-browse-view-btn ${viewTab === 'all-comments-feed' ? 'is-active' : ''}`}
                onClick={() => setViewTab('all-comments-feed')}
              >
                <i className="fas fa-list-ul" aria-hidden="true" />
                <span>All Comments Feed</span>
              </button>
            </div>

          </div>
        </div>

        {/* View Mode 1: Split Master-Detail Layout */}
        {viewTab === 'study-hub' ? (
          <div className="library-engagement-split">

            {/* Left Column: Research Studies List */}
            <div className="library-engagement-list-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Research Studies ({filteredStudies.length})
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Click to view comments
                </span>
              </div>

              {filteredStudies.length === 0 ? (
                <div className="library-browse-empty-state" style={{ padding: '3rem 1.5rem' }}>
                  <i className="fas fa-search" style={{ fontSize: '2rem', color: '#94A3B8' }} aria-hidden="true" />
                  <p style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>No matching studies found</p>
                  <button
                    type="button"
                    className="library-active-chip-clear-all"
                    onClick={() => {
                      setSearchQuery('');
                      setDepartmentFilter('all');
                      setHasCommentsOnly(false);
                    }}
                  >
                    Clear Filters
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
                        <span className="library-browse-card-views">
                          <i className="fas fa-eye" aria-hidden="true" />
                          {study.views.toLocaleString()} reads
                        </span>
                      </div>

                      <h3 className="library-engagement-study-title">
                        {study.title}
                      </h3>

                      <div className="library-engagement-study-meta">
                        <span>{study.authorsShort || study.authors[0]}</span>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span>{study.year}</span>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span>Adviser: {study.adviser}</span>
                      </div>

                      <div className="library-engagement-study-footer">
                        <span className={`library-engagement-comment-pill ${studyComments.length === 0 ? 'has-none' : ''}`}>
                          <i className="fas fa-comment" aria-hidden="true" />
                          {studyComments.length} {studyComments.length === 1 ? 'Comment' : 'Comments'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: isSelected ? '#003A8F' : '#94A3B8', fontWeight: 700 }}>
                          {isSelected ? 'Viewing ➔' : 'Select'}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Right Column: Active Study Views & Comments Hub Panel */}
            <div className="library-engagement-hub-panel">
              
              {/* Header */}
              <div className="library-engagement-hub-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`library-dept-pill ${getDeptPillClass(activeStudy.department)}`}>
                    {activeStudy.department} - {getDepartmentLabel(activeStudy.department)}
                  </span>
                  <span className="library-browse-type-badge">
                    <i className={`fas ${getProjectIcon(activeStudy.type)}`} aria-hidden="true" />
                    {activeStudy.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
                    Published {activeStudy.year}
                  </span>
                  <Link
                    href={`/library/project-details?id=${activeStudy.id}`}
                    style={{ marginLeft: 'auto', textDecoration: 'none', color: '#003A8F', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span>Full Study Page</span>
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

              {/* Readership Breakdown Strip */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.6rem' }}>
                  Readership & View Statistics
                </span>
                <div className="library-engagement-views-strip">
                  <div className="library-engagement-view-box">
                    <span>Total Views</span>
                    <strong>{activeStudy.views.toLocaleString()}</strong>
                  </div>
                  <div className="library-engagement-view-box">
                    <span>Signed-in Campus</span>
                    <strong style={{ color: '#003A8F' }}>{Math.round(activeStudy.views * 0.72).toLocaleString()}</strong>
                  </div>
                  <div className="library-engagement-view-box">
                    <span>Guest Visitors</span>
                    <strong style={{ color: '#D97706' }}>{Math.round(activeStudy.views * 0.28).toLocaleString()}</strong>
                  </div>
                  <div className="library-engagement-view-box">
                    <span>Archived Notes</span>
                    <strong style={{ color: '#059669' }}>{activeStudyComments.length}</strong>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="library-comments-thread">
                <div className="library-comments-thread-head">
                  <h3>
                    <i className="fas fa-comment-dots" style={{ color: '#003A8F' }} aria-hidden="true" />
                    <span>Librarian Notes & Review Comments ({activeStudyComments.length})</span>
                  </h3>
                </div>

                {/* Add new comment composer */}
                <form onSubmit={handlePostComment} className="library-comment-composer">
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Post Librarian Comment / Archival Note
                  </span>
                  
                  <textarea
                    rows={3}
                    placeholder={`Write a comment or archival note for "${activeStudy.title}" (e.g. hard copy shelf cataloging, defense verification, revision remarks)...`}
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    required
                  />

                  <div className="library-comment-composer-actions">
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={commentRole}
                        onChange={(e) => setCommentRole(e.target.value as typeof commentRole)}
                        className="library-comment-type-select"
                        title="Your comment role"
                      >
                        <option value="Librarian">Role: Librarian</option>
                        <option value="Adviser">Role: Adviser</option>
                        <option value="Panel Chair">Role: Panel Chair</option>
                      </select>

                      <select
                        value={commentCategory}
                        onChange={(e) => setCommentCategory(e.target.value)}
                        className="library-comment-type-select"
                        title="Comment category"
                      >
                        <option value="Archive Record">Category: Archive Record</option>
                        <option value="Cataloging Note">Category: Cataloging Note</option>
                        <option value="Clearance Note">Category: Clearance Note</option>
                        <option value="Format Review">Category: Format Review</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!commentDraft.trim()}
                      className="library-comment-post-btn"
                    >
                      <i className="fas fa-paper-plane" aria-hidden="true" />
                      <span>Post Comment</span>
                    </button>
                  </div>
                </form>

                {/* List of comments for this study */}
                {activeStudyComments.length === 0 ? (
                  <div style={{ padding: '2.5rem 1.5rem', background: '#F8FAFC', borderRadius: '1rem', border: '1px dashed #CBD5E1', textAlign: 'center' }}>
                    <i className="fas fa-comment-slash" style={{ fontSize: '2rem', color: '#94A3B8', marginBottom: '0.5rem' }} aria-hidden="true" />
                    <p style={{ margin: '0 0 0.3rem 0', fontWeight: 700, color: '#0F172A' }}>No comments recorded yet</p>
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                      Use the box above to record the first cataloging note, shelf reference, or archival observation for this research.
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
                              {comment.category && (
                                <span style={{ fontSize: '0.72rem', background: '#F1F5F9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                                  {comment.category}
                                </span>
                              )}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                {formatDate(comment.createdAt)}
                              </span>
                              <button
                                type="button"
                                className="library-comment-delete-btn"
                                onClick={() => handleDeleteComment(comment.id)}
                                title="Remove this note"
                              >
                                <i className="fas fa-trash-can" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <p className="library-comment-text">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>
        ) : (

          /* View Mode 2: Master All-Comments Activity Feed */
          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.75rem', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0, 58, 143, 0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                  All Recent Comments Across Research Projects
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748B', fontSize: '0.85rem' }}>
                  Live chronological record of librarian feedback, panel verifications, and archival remarks.
                </p>
              </div>
              <span className="library-browse-stat-pill is-primary">
                {comments.length} Total Records
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
                        <div style={{ marginBottom: '0.25rem' }}>
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
                        </div>
                      )}

                      <div className="library-comment-meta-row">
                        <span className="library-comment-author-name">
                          {comment.authorName}
                          <span className={`library-comment-role-badge ${getAvatarClass(comment.authorRole)}`}>
                            {comment.authorRole}
                          </span>
                          {comment.category && (
                            <span style={{ fontSize: '0.72rem', background: '#F1F5F9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                              {comment.category}
                            </span>
                          )}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            {formatDate(comment.createdAt)}
                          </span>
                          <button
                            type="button"
                            className="library-comment-delete-btn"
                            onClick={() => handleDeleteComment(comment.id)}
                            title="Remove this comment"
                          >
                            <i className="fas fa-trash-can" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <p className="library-comment-text">
                        {comment.body}
                      </p>
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
