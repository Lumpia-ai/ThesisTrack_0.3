'use client';

import { useMemo, useState } from 'react';
import {
  TECH_TRANSFER_DOCUMENTS,
  getTechTransferStatusTone
} from '@/components/tech-transfer/tech-transfer-data';
import {
  TechTransferButton,
  TechTransferModal,
  TechTransferStatCard,
  TechTransferStatusBadge
} from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

export function TechTransferDocuments() {
  const [statusFilter, setStatusFilter] = useState('All Documents');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const documents = useMemo(() => {
    return TECH_TRANSFER_DOCUMENTS.filter((document) => {
      return statusFilter === 'All Documents' || document.status === statusFilter;
    });
  }, [statusFilter]);

  const selectedDocument =
    TECH_TRANSFER_DOCUMENTS.find((document) => document.id === selectedDocumentId) ?? TECH_TRANSFER_DOCUMENTS[0];

  return (
    <TechTransferShell
      activeNav="documents"
      title="MOA / Documents"
      description="Track agreement routing, supporting files, and endorsement readiness"
      notificationCount={3}
    >
      <div className="filter-bar">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Documents</option>
          <option>Ready</option>
          <option>Processing</option>
          <option>For Signature</option>
        </select>
        <TechTransferButton variant="primary" onClick={() => setUploadOpen(true)}>
          <i aria-hidden="true" className="fas fa-upload" />
          Upload Document
        </TechTransferButton>
      </div>

      <div className="stats-grid">
        <TechTransferStatCard title="Tracked Documents" value={TECH_TRANSFER_DOCUMENTS.length} />
        <TechTransferStatCard title="Ready for Release" value={TECH_TRANSFER_DOCUMENTS.filter((item) => item.status === 'Ready').length} />
        <TechTransferStatCard title="For Signature" value={TECH_TRANSFER_DOCUMENTS.filter((item) => item.status === 'For Signature').length} />
        <TechTransferStatCard title="Processing Queue" value={TECH_TRANSFER_DOCUMENTS.filter((item) => item.status === 'Processing').length} />
      </div>

      <section className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Project</th>
                <th>Partner</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td><strong>{document.title}</strong></td>
                  <td>{document.type}</td>
                  <td>{document.project}</td>
                  <td>{document.partner}</td>
                  <td>{document.owner}</td>
                  <td>
                    <TechTransferStatusBadge tone={getTechTransferStatusTone(document.status)}>
                      {document.status}
                    </TechTransferStatusBadge>
                  </td>
                  <td>{document.updatedAt}</td>
                  <td>
                    <TechTransferButton small onClick={() => setSelectedDocumentId(document.id)}>
                      Open
                    </TechTransferButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TechTransferModal
        open={Boolean(selectedDocumentId)}
        title={selectedDocument.title}
        onClose={() => setSelectedDocumentId('')}
        footer={<TechTransferButton variant="primary" onClick={() => setSelectedDocumentId('')}>Close</TechTransferButton>}
      >
        <p><strong>Project:</strong> {selectedDocument.project}</p>
        <p><strong>Partner:</strong> {selectedDocument.partner}</p>
        <p><strong>Owner:</strong> {selectedDocument.owner}</p>
        <p><strong>Status:</strong> {selectedDocument.status}</p>
        <p>Use this document record to coordinate routing, signatures, and compliance attachments.</p>
      </TechTransferModal>

      <TechTransferModal
        open={uploadOpen}
        title="Upload Document"
        onClose={() => setUploadOpen(false)}
        footer={
          <>
            <TechTransferButton onClick={() => setUploadOpen(false)}>Cancel</TechTransferButton>
            <TechTransferButton variant="primary" onClick={() => setUploadOpen(false)}>
              Upload Document
            </TechTransferButton>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="upload-doc-type">Document Type</label>
          <select id="upload-doc-type" defaultValue="MOA">
            <option>Memorandum of Agreement (MOA)</option>
            <option>Letter of Intent (LOI)</option>
            <option>Deployment Certificate</option>
            <option>Other Legal Document</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="upload-doc-project">Associated Project</label>
          <input id="upload-doc-project" placeholder="e.g. AgriTech Predictor" />
        </div>
        <div className="form-group">
          <label htmlFor="upload-doc-file">Select File (PDF, DOCX)</label>
          <input id="upload-doc-file" type="file" accept=".pdf,.doc,.docx" className="form-control" />
        </div>
      </TechTransferModal>
    </TechTransferShell>
  );
}
