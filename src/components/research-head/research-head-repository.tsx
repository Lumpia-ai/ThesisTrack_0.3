'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';

type RepositoryDocument = {
  id: string;
  name: string;
  type: string;
  department: string;
  project: string;
  status: 'Approved' | 'Archived';
  uploadedBy: string;
  date: string;
  size: string;
};

const REPOSITORY_STATS = [
  { label: 'Total Documents', value: '1,247', icon: 'fa-copy' },
  { label: 'Pending Review', value: '14', icon: 'fa-clock' },
  { label: 'Approved', value: '1,089', icon: 'fa-circle-check' },
  { label: 'Archived', value: '144', icon: 'fa-box-archive' },
  { label: 'Storage Used', value: '12.4 GB', icon: 'fa-hard-drive' }
];

const APPROVED_DOCUMENTS: RepositoryDocument[] = [
  {
    id: 'DOC-2026-001',
    name: 'AI_Learning_System_Final_Manuscript.pdf',
    type: 'Manuscript',
    department: 'IT',
    project: 'AI-Powered Learning System',
    status: 'Approved',
    uploadedBy: 'Uploader pending',
    date: 'May 8, 2026',
    size: '4.2 MB'
  },
  {
    id: 'DOC-2026-002',
    name: 'Smart_Energy_Monitor_Proposal.pdf',
    type: 'Proposal',
    department: 'MET',
    project: 'Smart Energy Monitor',
    status: 'Approved',
    uploadedBy: 'Uploader pending',
    date: 'May 7, 2026',
    size: '2.1 MB'
  },
  {
    id: 'DOC-2026-003',
    name: 'Defense_Presentation_IT_ALS.pptx',
    type: 'Presentation',
    department: 'IT',
    project: 'AI-Powered Learning System',
    status: 'Approved',
    uploadedBy: 'Dr. Ricardo Cruz',
    date: 'May 5, 2026',
    size: '5.8 MB'
  },
  {
    id: 'DOC-2026-004',
    name: 'MOA_TechCorp_Signed_2026.pdf',
    type: 'MOA',
    department: 'IT',
    project: 'AI Inventory System',
    status: 'Archived',
    uploadedBy: 'Carlos Mendoza',
    date: 'Apr 28, 2026',
    size: '1.2 MB'
  },
  {
    id: 'DOC-2026-005',
    name: 'Research_Ethics_Certificate_IT.pdf',
    type: 'Certificate',
    department: 'IT',
    project: 'AI-Powered Learning System',
    status: 'Approved',
    uploadedBy: 'Uploader pending',
    date: 'Apr 22, 2026',
    size: '0.8 MB'
  },
  {
    id: 'DOC-2026-006',
    name: 'Marine_Pollution_Detector_Manuscript.pdf',
    type: 'Manuscript',
    department: 'NAME',
    project: 'Marine Pollution Detector',
    status: 'Archived',
    uploadedBy: 'Elena Aquino',
    date: 'Apr 15, 2026',
    size: '6.4 MB'
  },
  {
    id: 'DOC-2026-007',
    name: 'Sustainable_Agri_IoT_Full_Package.zip',
    type: 'Manuscript',
    department: 'ESM',
    project: 'Sustainable Agriculture IoT',
    status: 'Approved',
    uploadedBy: 'Carlos Mendoza',
    date: 'May 9, 2026',
    size: '22.1 MB'
  },
  {
    id: 'DOC-2026-008',
    name: 'MOA_OceanTech_Partnership.pdf',
    type: 'MOA',
    department: 'NAME',
    project: 'Marine Pollution Detector',
    status: 'Archived',
    uploadedBy: 'Elena Aquino',
    date: 'Mar 20, 2026',
    size: '1.5 MB'
  }
];

export function ResearchHeadRepository() {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('All Types');
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<RepositoryDocument | null>(null);

  useEffect(() => {
    if (!selectedDocument) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedDocument(null);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedDocument]);

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const filteredDocuments = useMemo(
    () =>
      APPROVED_DOCUMENTS.filter((document) => {
        const matchesDepartment = departmentFilter === 'All Departments' || document.department === departmentFilter;
        const matchesType = documentTypeFilter === 'All Types' || document.type === documentTypeFilter;
        const matchesQuery =
          !query ||
          document.name.toLowerCase().includes(query.toLowerCase()) ||
          document.project.toLowerCase().includes(query.toLowerCase()) ||
          document.uploadedBy.toLowerCase().includes(query.toLowerCase());

        return matchesDepartment && matchesType && matchesQuery;
      }),
    [departmentFilter, documentTypeFilter, query]
  );

  return (
    <>
      <ResearchHeadShell
        activeNav="repository"
        title="Official Institutional Repository"
        description="Approved thesis, capstone, MOA, presentation, and evidence files archived in the institutional repository. Only Research Head-approved documents appear here."
      >
        <div className="admin-page-stack repo-page">
          <header className="repo-page-header">
            <h1>Official Institutional Repository</h1>
            <div className="repo-page-actions">
              <button className="btn btn-outline repo-btn" type="button" onClick={() => showToast('Repository analytics loading...', 'info')}>
                <i className="fas fa-chart-pie"></i>
                Analytics
              </button>
              <button className="btn btn-outline repo-btn" type="button" onClick={() => setImportModalOpen(true)}>
                <i className="fas fa-file-import"></i>
                Import Legacy
              </button>
            </div>
          </header>

          <section className="repo-stats-grid" aria-label="Repository statistics">
            {REPOSITORY_STATS.map((stat) => (
              <article key={stat.label} className="repo-stat-card">
                <div className="repo-stat-icon">
                  <i className={`fas ${stat.icon}`}></i>
                </div>
                <div className="repo-stat-body">
                  <span className="repo-stat-label">{stat.label}</span>
                  <strong className="repo-stat-value">{stat.value}</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Official Repository Records</h3>
              <span className="status-badge status-approved">
                {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
              </span>
            </div>

            <div className="repo-filter-bar">
              <div className="repo-filter-search">
                <i className="fas fa-magnifying-glass"></i>
                <input
                  className="repo-filter-input"
                  aria-label="Search documents"
                  placeholder="Search by document name, project, or uploader..."
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                className="repo-filter-select"
                aria-label="Department"
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
                <option>All Departments</option>
                <option>IT</option>
                <option>MET</option>
                <option>TCM</option>
                <option>ESM</option>
                <option>NAME</option>
              </select>
              <select
                className="repo-filter-select"
                aria-label="Document type"
                value={documentTypeFilter}
                onChange={(event) => setDocumentTypeFilter(event.target.value)}
              >
                <option>All Types</option>
                <option>Proposal</option>
                <option>Manuscript</option>
                <option>Presentation</option>
                <option>MOA</option>
                <option>Certificate</option>
              </select>
              <select
                className="repo-filter-select"
                aria-label="Date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option>All Dates</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>This Semester</option>
                <option>This Year</option>
              </select>
              <div className="repo-filter-actions">
                <button className="btn btn-outline repo-btn" type="button" onClick={() => showToast('PDF export started.', 'success')}>
                  <i className="fas fa-file-pdf"></i>
                  Export PDF
                </button>
                <button className="btn btn-outline repo-btn" type="button" onClick={() => showToast('Excel export started.', 'success')}>
                  <i className="fas fa-file-excel"></i>
                  Export Excel
                </button>
              </div>
            </div>

            {filteredDocuments.length > 0 ? (
              <div className="table-scroll">
                <table className="repo-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Type</th>
                      <th>Department</th>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                      <th>Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((document) => (
                      <tr key={document.id}>
                        <td>
                          <div className="repo-doc-cell">
                            <i className="fas fa-file-lines repo-doc-icon"></i>
                            <div>
                              <strong className="repo-doc-name">{document.name}</strong>
                              <span className="repo-doc-id">{document.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="repo-type-pill">{document.type}</span>
                        </td>
                        <td><span className="dept-badge">{document.department}</span></td>
                        <td><span className="table-title">{document.project}</span></td>
                        <td>
                          <span className={`status-badge ${document.status === 'Approved' ? 'status-approved' : 'status-neutral'}`}>
                            {document.status}
                          </span>
                        </td>
                        <td>{document.uploadedBy}</td>
                        <td>{document.date}</td>
                        <td>{document.size}</td>
                        <td>
                          <button
                            className="btn btn-outline repo-btn"
                            type="button"
                            aria-label={`View details for ${document.name}`}
                            onClick={() => setSelectedDocument(document)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="repo-empty-state">
                <i className="fas fa-folder-open"></i>
                <strong>No documents found</strong>
                <p>No approved repository records match your current search or filter criteria.</p>
              </div>
            )}

            <div className="repo-pagination-row">
              <span className="repo-pagination-info">
                Showing {filteredDocuments.length} of {APPROVED_DOCUMENTS.length} approved documents
              </span>
            </div>
          </section>
        </div>
      </ResearchHeadShell>

      {/* Document Details Modal: View and Download live here instead of as row icons. */}
      {selectedDocument ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && setSelectedDocument(null)}>
          <div className="modal-content record-modal" role="dialog" aria-modal="true" aria-labelledby="repo-document-title">
            <div className="modal-header">
              <div>
                <h3 id="repo-document-title">{selectedDocument.name}</h3>
                <p className="record-modal-meta">
                  <span>{selectedDocument.id}</span>
                  <span className={`status-badge ${selectedDocument.status === 'Approved' ? 'status-approved' : 'status-neutral'}`}>
                    {selectedDocument.status}
                  </span>
                </p>
              </div>
              <button className="close-modal" type="button" aria-label="Close" onClick={() => setSelectedDocument(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <section className="record-modal-section" aria-labelledby="repo-document-details">
                <h4 id="repo-document-details">Document Details</h4>
                <dl className="record-details-list">
                  <div>
                    <dt>Type</dt>
                    <dd><span className="repo-type-pill">{selectedDocument.type}</span></dd>
                  </div>
                  <div>
                    <dt>Department</dt>
                    <dd>{selectedDocument.department}</dd>
                  </div>
                  <div className="record-details-wide">
                    <dt>Project</dt>
                    <dd>{selectedDocument.project}</dd>
                  </div>
                  <div>
                    <dt>Uploaded By</dt>
                    <dd>{selectedDocument.uploadedBy}</dd>
                  </div>
                  <div>
                    <dt>Date</dt>
                    <dd>{selectedDocument.date}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{selectedDocument.size}</dd>
                  </div>
                </dl>
              </section>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setSelectedDocument(null)}>
                Close
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => showToast(`Opening ${selectedDocument.name}...`, 'info')}
              >
                <i className="fas fa-eye" aria-hidden="true"></i>
                View Document
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => showToast(`Download started: ${selectedDocument.name}`, 'success')}
              >
                <i className="fas fa-download" aria-hidden="true"></i>
                Download
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Import Legacy Modal */}
      {importModalOpen ? (
        <div
          className="modal show"
          onClick={(event) => event.target === event.currentTarget && setImportModalOpen(false)}
        >
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3><i className="fas fa-file-import" style={{ marginRight: '0.5rem' }}></i> Manual Import / Import Legacy File</h3>
                <p>Import old thesis records, migrated files, backlog records, or files submitted outside the system.</p>
              </div>
              <button className="close-modal" type="button" onClick={() => setImportModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="repo-import-notice">
                <i className="fas fa-shield-halved"></i>
                <div>
                  <strong>Admin only</strong>
                  <p>Use only for legacy records and special authorized cases. Normal documents flow through the student → adviser → department → Research Head approval workflow.</p>
                </div>
              </div>
              <div className="admin-form-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Document Title</label>
                  <input placeholder="Enter document title" />
                </div>
                <div className="form-group">
                  <label>Document Type</label>
                  <select defaultValue="">
                    <option value="" disabled>Select type</option>
                    <option>Proposal</option>
                    <option>Manuscript</option>
                    <option>Presentation</option>
                    <option>MOA</option>
                    <option>Certificate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select defaultValue="">
                    <option value="" disabled>Select department</option>
                    <option>IT</option>
                    <option>MET</option>
                    <option>TCM</option>
                    <option>ESM</option>
                    <option>NAME</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Project Name</label>
                  <input placeholder="Associated project" />
                </div>
                <div className="form-group">
                  <label>Original Date</label>
                  <input type="date" />
                </div>
                <div className="form-group">
                  <label>Import Reason</label>
                  <select defaultValue="">
                    <option value="" disabled>Select reason</option>
                    <option>Legacy thesis record</option>
                    <option>Migrated file</option>
                    <option>Backlog record</option>
                    <option>Special authorized case</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>File Upload</label>
                <div className="repo-import-dropzone">
                  <i className="fas fa-cloud-arrow-up"></i>
                  <p>Drag and drop files here, or click to browse</p>
                  <span>PDF, DOCX, PPTX, ZIP up to 50MB</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setImportModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={() => { setImportModalOpen(false); showToast('Legacy file imported successfully.', 'success'); }}>
                <i className="fas fa-file-import"></i>
                Import to Repository
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div className="fra-toast fra-toast-success" role="status">
          <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'info-circle'}`}></i>
          <span>{toast.message}</span>
        </div>
      ) : null}
    </>
  );
}
