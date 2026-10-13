'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ClearanceData = {
  serialNumber: string; // e.g. 'CLR-2026-IT-014'
  submissionId: string; // e.g. 'CAP-IT-2025-014'
  callNumber: string; // e.g. 'LIB-2026-IT-014'
  title: string;
  authors: string[];
  department: string; // e.g. 'BSIT' or 'Information Technology'
  adviser: string;
  projectType?: string; // e.g. 'Capstone Project'
  validatedBy?: string; // e.g. 'Engr. Lara Mercado'
  archivedAt?: string; // e.g. 'Sep 22, 2026, 10:15 AM'
  librarianName?: string; // e.g. 'Dr. Patricia E. Alcantara, RL'
};

interface LibraryClearanceSlipModalProps {
  clearance: ClearanceData;
  onClose: () => void;
}

export function LibraryClearanceSlipModal({ clearance, onClose }: LibraryClearanceSlipModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const certScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Lock background page scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-scroll certificate content to the very top upon opening
    if (certScrollRef.current) {
      certScrollRef.current.scrollTop = 0;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = async () => {
    const textToCopy = `Clearance Serial: ${clearance.serialNumber}\nCall Number: ${clearance.callNumber}\nStudy Title: ${clearance.title}\nAuthors: ${clearance.authors.join(', ')}\nDate Cleared: ${clearance.archivedAt || new Date().toLocaleDateString()}\nStatus: Officially Cleared & Archived in ThesisTrack Repository`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2800);
    } catch {
      // Fallback
    }
  };

  const formattedDate = clearance.archivedAt || new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="library-clearance-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-clearance-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="library-clearance-modal-container">
        
        {/* Top Control Bar (Hidden during printing) */}
        <div className="library-clearance-modal-toolbar library-clearance-print-hide">
          <div className="library-clearance-toolbar-left">
            <span className="library-clearance-toolbar-badge">
              <i className="fas fa-shield-alt" aria-hidden="true" />
              Verified Archival Slip
            </span>
            <span className="library-clearance-toolbar-serial">
              Ref: <strong>{clearance.serialNumber}</strong>
            </span>
          </div>

          <div className="library-clearance-toolbar-actions">
            <button
              type="button"
              className="library-clearance-btn-copy"
              onClick={handleCopyCode}
              title="Copy official clearance record"
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-clipboard'}`} aria-hidden="true" />
              <span>{copied ? 'Copied to Clipboard' : 'Copy Record'}</span>
            </button>

            <button
              type="button"
              className="library-clearance-btn-print"
              onClick={handlePrint}
              title="Print official clearance certificate"
            >
              <i className="fas fa-print" aria-hidden="true" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              className="library-clearance-btn-close"
              onClick={onClose}
              aria-label="Close clearance dialog"
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Certificate Sheet (Printable Document & Scrollable Body) */}
        <div
          ref={certScrollRef}
          className="library-clearance-certificate"
          id="clearance-printable-sheet"
        >
          
          {/* Decorative Outer and Inner Frame */}
          <div className="library-clearance-frame">

            {/* University & Library Header */}
            <header className="library-clearance-header">
              <div className="library-clearance-crest">
                <i className="fas fa-university" aria-hidden="true" />
              </div>

              <div className="library-clearance-titles">
                <span className="library-clearance-org">TECHNOLOGICAL UNIVERSITY DIGITAL REPOSITORY</span>
                <span className="library-clearance-office">OFFICE OF UNIVERSITY LIBRARY AND ARCHIVAL SERVICES</span>
                <h2 id="library-clearance-title" className="library-clearance-doc-title">
                  CERTIFICATE OF DIGITAL REPOSITORY CLEARANCE & ARCHIVAL
                </h2>
                <span className="library-clearance-tagline">
                  Official Verification of Completed Research Deposit for Degree Conferment
                </span>
              </div>

              <div className="library-clearance-seal-emblem" aria-hidden="true">
                <i className="fas fa-award" />
              </div>
            </header>

            {/* Metadata Reference Strip */}
            <div className="library-clearance-meta-strip">
              <div className="library-clearance-strip-item">
                <span className="library-clearance-strip-label">Clearance Serial No.</span>
                <strong className="library-clearance-strip-value">{clearance.serialNumber}</strong>
              </div>
              <div className="library-clearance-strip-item">
                <span className="library-clearance-strip-label">Permanent Call No.</span>
                <strong className="library-clearance-strip-value">{clearance.callNumber}</strong>
              </div>
              <div className="library-clearance-strip-item">
                <span className="library-clearance-strip-label">Archived & Cleared Date</span>
                <strong className="library-clearance-strip-value">{formattedDate}</strong>
              </div>
              <div className="library-clearance-strip-item">
                <span className="library-clearance-strip-label">Manuscript ID</span>
                <strong className="library-clearance-strip-value">{clearance.submissionId}</strong>
              </div>
            </div>

            {/* Formal Body Recital */}
            <div className="library-clearance-body">
              <p className="library-clearance-intro">
                THIS IS TO CERTIFY that the terminal undergraduate/graduate research manuscript titled:
              </p>

              <div className="library-clearance-title-box">
                <h3 className="library-clearance-study-title">
                  &ldquo;{clearance.title}&rdquo;
                </h3>
              </div>

              {/* Researcher Details Grid (2x2 Balanced Cards Layout to Occupy Space) */}
              <div className="library-clearance-details-grid">
                <div className="library-clearance-detail-card">
                  <span className="library-clearance-detail-label">Researchers / Authors</span>
                  <strong className="library-clearance-detail-val">{clearance.authors.join(', ')}</strong>
                </div>

                <div className="library-clearance-detail-card">
                  <span className="library-clearance-detail-label">Research Adviser</span>
                  <span className="library-clearance-detail-val">{clearance.adviser}</span>
                </div>

                <div className="library-clearance-detail-card">
                  <span className="library-clearance-detail-label">Degree / Program</span>
                  <span className="library-clearance-detail-val">
                    {clearance.department.startsWith('BS') ? clearance.department : `BS ${clearance.department}`} · {clearance.projectType || 'Capstone Project'}
                  </span>
                </div>

                <div className="library-clearance-detail-card">
                  <span className="library-clearance-detail-label">Validation Endorser</span>
                  <span className="library-clearance-detail-val">{clearance.validatedBy || 'Engr. Lara Mercado (Research Focal Person)'}</span>
                </div>
              </div>

              {/* Compliance Verification Table */}
              <div className="library-clearance-compliance-box">
                <span className="library-clearance-compliance-heading">
                  INSTITUTIONAL ARCHIVAL COMPLIANCE CHECKLIST
                </span>

                <div className="library-clearance-compliance-grid">
                  <div className="library-clearance-chk-item">
                    <i className="fas fa-check-circle" aria-hidden="true" />
                    <span>Final corrected manuscript PDF/A deposited</span>
                  </div>
                  <div className="library-clearance-chk-item">
                    <i className="fas fa-check-circle" aria-hidden="true" />
                    <span>Adviser & Defense panel signed approval sheets</span>
                  </div>
                  <div className="library-clearance-chk-item">
                    <i className="fas fa-check-circle" aria-hidden="true" />
                    <span>Research focal person endorsement complete</span>
                  </div>
                  <div className="library-clearance-chk-item">
                    <i className="fas fa-check-circle" aria-hidden="true" />
                    <span>Intellectual property (IP) evaluation filed</span>
                  </div>
                  <div className="library-clearance-chk-item">
                    <i className="fas fa-check-circle" aria-hidden="true" />
                    <span>Research completion & submission form on file</span>
                  </div>
                  <div className="library-clearance-chk-item">
                    <i className="fas fa-check-circle" aria-hidden="true" />
                    <span>Permanent catalog accession code assigned</span>
                  </div>
                </div>
              </div>

              {/* Formal Clearance Declaration */}
              <p className="library-clearance-statement">
                Having strictly satisfied all institutional repository prerequisites, technical specifications, and post-defense requirements prescribed by university research guidelines, the above-named researchers are hereby granted <strong>OFFICIAL DIGITAL LIBRARY CLEARANCE</strong> for academic records, graduation clearance, and degree conferment.
              </p>

            </div>

            {/* Official Signatures & Seal Footer */}
            <footer className="library-clearance-footer">
              
              {/* Validator Signature Block */}
              <div className="library-clearance-sig-col">
                <div className="library-clearance-sig-line">
                  <span className="library-clearance-sig-handwriting">Lara Mercado, PE</span>
                </div>
                <strong className="library-clearance-sig-name">Engr. Lara Mercado</strong>
                <span className="library-clearance-sig-role">Research Focal Person & Validator</span>
                <span className="library-clearance-sig-org">Department Research Committee</span>
              </div>

              {/* Center Seal Stamp */}
              <div className="library-clearance-stamp-col">
                <div className="library-clearance-stamp">
                  <div className="library-clearance-stamp-inner">
                    <i className="fas fa-check-double" aria-hidden="true" />
                    <span className="library-clearance-stamp-txt">OFFICIALLY ARCHIVED</span>
                    <span className="library-clearance-stamp-sub">THESISTRACK REPOSITORY</span>
                    <span className="library-clearance-stamp-code">{clearance.callNumber}</span>
                  </div>
                </div>
              </div>

              {/* Chief Librarian Signature Block */}
              <div className="library-clearance-sig-col">
                <div className="library-clearance-sig-line">
                  <span className="library-clearance-sig-handwriting">P. E. Alcantara</span>
                </div>
                <strong className="library-clearance-sig-name">
                  {clearance.librarianName || 'Dr. Patricia E. Alcantara, RL'}
                </strong>
                <span className="library-clearance-sig-role">Head University Librarian & Archivist</span>
                <span className="library-clearance-sig-org">Institutional Library Services</span>
              </div>

            </footer>

            {/* Micro Security Bar */}
            <div className="library-clearance-security-bar">
              <span className="library-clearance-sec-code">
                Security Hash: <code>{clearance.submissionId}-SEC-{clearance.callNumber}</code>
              </span>
              <span className="library-clearance-sec-note">
                Electronically generated & verified via ThesisTrack Repository Portal. Valid for graduation clearance without dry seal alteration.
              </span>
            </div>

          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden during printing) */}
        <div className="library-clearance-bottom-bar library-clearance-print-hide">
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '0.4rem', color: '#003A8F' }} />
            Students can present this clearance slip to the University Registrar for final graduation clearance.
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="library-clearance-btn-close-flat"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="library-clearance-btn-print"
              onClick={handlePrint}
            >
              <i className="fas fa-print" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
