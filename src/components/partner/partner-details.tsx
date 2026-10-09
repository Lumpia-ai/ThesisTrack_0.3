'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getImpactStars, getPartnerTechnology } from '@/components/partner/partner-data';
import {
  PartnerButton,
  PartnerDepartmentBadge,
  PartnerModal,
  PartnerStatusBadge
} from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';

export function PartnerDetails() {
  const searchParams = useSearchParams();
  const [contactOpen, setContactOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const technology = getPartnerTechnology(searchParams.get('id'));

  return (
    <PartnerShell
      activeNav="details"
      title="Project Details"
      description="Comprehensive information about available technologies"
      notificationCount={2}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section style={{ background: 'linear-gradient(135deg, #003A8F, #1A1851)', borderRadius: '1.5rem', padding: '2.5rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 15px 35px rgba(0, 58, 143, 0.15)', position: 'relative', overflow: 'hidden' }}>
          <i className={`fas ${technology.icon}`} style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '14rem', color: 'rgba(255,255,255,0.05)', transform: 'rotate(-10deg)' }}></i>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800 }}>{technology.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>{technology.department} Department</span>
                <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700, border: 'none' }}>{technology.trl}</span>
              </div>
            </div>
            <Link className="btn" href={`/partner/request?id=${technology.id}`} style={{ background: '#F6BE00', color: '#1A1851', padding: '0.8rem 1.5rem', borderRadius: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(246, 190, 0, 0.3)', transition: 'transform 0.2s' }}>
              <i aria-hidden="true" className="fas fa-handshake" /> Request Adoption
            </Link>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', marginTop: '1rem', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem', color: '#DBEAFE' }}>
              <span>Technology Readiness</span>
              <span style={{ color: '#F6BE00' }}>{technology.readinessPercent}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${technology.readinessPercent}%`, background: 'linear-gradient(90deg, #F6BE00, #FBBF24)', height: '100%' }}></div>
            </div>
            <p style={{ margin: '0.8rem 0 0 0', fontSize: '0.9rem', color: '#93C5FD' }}>System complete and field-tested.</p>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '2rem', borderTop: '4px solid #003A8F', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', margin: '0 0 1.5rem 0', fontWeight: 800 }}>Project Overview</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#475569', fontSize: '0.95rem' }}>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Developers</strong> 
                {technology.developers}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adviser</strong> 
                {technology.adviser}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Development Period</strong> 
                {technology.timeline}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</strong> 
                <span className="status-badge status-approved" style={{ marginTop: '0.3rem', display: 'inline-block', background: '#DCFCE7', color: '#16A34A', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', border: 'none', fontSize: '0.8rem', fontWeight: 600 }}>Completed, ready for commercialization</span>
              </p>
            </div>
          </section>

          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '2rem', borderTop: '4px solid #F6BE00', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', margin: '0 0 1.5rem 0', fontWeight: 800 }}>Technology Specifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#475569', fontSize: '0.95rem' }}>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</strong> 
                {technology.platform}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Technologies</strong> 
                {technology.stack}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deployment Profile</strong> 
                Cloud-ready with partner onboarding package
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#1E293B', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact Rating</strong> 
                <span style={{ color: '#F6BE00', fontSize: '1.1rem' }}>{getImpactStars(technology.impactRating)}</span>
              </p>
            </div>
          </section>
        </div>

        <section style={{ background: 'white', borderRadius: '1.2rem', padding: '2rem', borderTop: '4px solid #003A8F', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#111827', margin: '0 0 1rem 0', fontWeight: 800 }}>Project Abstract</h3>
          <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.8, margin: 0 }}>{technology.abstract}</p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '2rem', borderTop: '4px solid #F6BE00', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', margin: '0 0 1.5rem 0', fontWeight: 800 }}>Performance Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#475569', fontSize: '0.95rem' }}>
              <p style={{ margin: 0 }}><strong style={{ color: '#1E293B' }}>Accuracy Rate:</strong> 94.5% in demand prediction</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#1E293B' }}>Response Time:</strong> Less than 200ms for live queries</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#1E293B' }}>User Adoption:</strong> Tested with 50+ end users</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#1E293B' }}>Cost Savings:</strong> Estimated 30% reduction in overhead</p>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: '#1E293B' }}>
                <span>Overall Performance Rating</span>
                <span style={{ color: '#16A34A' }}>94%</span>
              </div>
              <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: '94%', background: 'linear-gradient(90deg, #22C55E, #16A34A)' }} />
              </div>
            </div>
          </section>

          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '2rem', borderTop: '4px solid #003A8F', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', margin: '0 0 1.5rem 0', fontWeight: 800 }}>Target Industries</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
              {technology.industries.map((industry) => (
                <span key={industry} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#003A8F', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-check-circle" style={{ color: '#16A34A' }}></i> {industry}
                </span>
              ))}
            </div>
          </section>
        </div>

        <section style={{ background: 'white', borderRadius: '1.2rem', borderTop: '4px solid #F6BE00', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '2rem', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', margin: 0, fontWeight: 800 }}>Implementation Requirements</h3>
          </div>
          <div className="table-scroll" style={{ padding: '0 2rem 2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Requirement</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Description</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {technology.requirements.map((item, i) => (
                  <tr key={item.requirement} style={{ borderBottom: i === technology.requirements.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 0.5rem', color: '#003A8F', fontWeight: 700 }}>{item.requirement}</td>
                    <td style={{ padding: '1rem 0.5rem', color: '#475569' }}>{item.description}</td>
                    <td style={{ padding: '1rem 0.5rem', color: '#475569', fontWeight: 600 }}>{item.timeline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'white', padding: '1.5rem', borderRadius: '1.2rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setContactOpen(true)} style={{ background: '#F8FAFC', color: '#1E293B', border: '1px solid #E2E8F0', padding: '0.8rem 1.5rem', borderRadius: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background = '#E2E8F0'} onMouseOut={(e) => e.currentTarget.style.background = '#F8FAFC'}>
              <i aria-hidden="true" className="fas fa-envelope" style={{ color: '#003A8F' }} /> Contact Developer Team
            </button>
            <Link className="btn" href={`/partner/request?id=${technology.id}`} style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0, 58, 143, 0.2)' }}>
              <i aria-hidden="true" className="fas fa-handshake" /> Request Adoption
            </Link>
          </div>
          <button className="btn" onClick={() => setDownloadOpen(true)} style={{ background: '#F8FAFC', color: '#1E293B', border: '1px solid #E2E8F0', padding: '0.8rem 1.5rem', borderRadius: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background = '#E2E8F0'} onMouseOut={(e) => e.currentTarget.style.background = '#F8FAFC'}>
            <i aria-hidden="true" className="fas fa-download" style={{ color: '#16A34A' }} /> Download Brochure
          </button>
        </div>
      </div>

      <PartnerModal
        open={contactOpen}
        title="Contact Development Team"
        onClose={() => setContactOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setContactOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600 }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setContactOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #003A8F, #1E40AF)', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Send Message <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '0.5rem 0' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="partner-contact-name" style={{ fontWeight: 600, color: '#334155' }}>Your Name</label>
            <input defaultValue="TechCorp Inc." id="partner-contact-name" style={{ padding: '0.8rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="partner-contact-email" style={{ fontWeight: 600, color: '#334155' }}>Email</label>
            <input defaultValue="contact@techcorp.com" id="partner-contact-email" style={{ padding: '0.8rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="partner-contact-subject" style={{ fontWeight: 600, color: '#334155' }}>Subject</label>
            <input defaultValue={`Inquiry about ${technology.title}`} id="partner-contact-subject" style={{ padding: '0.8rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }} />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="partner-contact-message" style={{ fontWeight: 600, color: '#334155' }}>Message</label>
            <textarea
              defaultValue="We are interested in adopting this technology. Please share more information about implementation and operational requirements."
              id="partner-contact-message"
              rows={5}
              style={{ padding: '0.8rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', resize: 'vertical' }}
            />
          </div>
        </div>
      </PartnerModal>

      <PartnerModal
        open={downloadOpen}
        title="Download Information Package"
        narrow
        onClose={() => setDownloadOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setDownloadOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600 }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setDownloadOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #16A34A, #15803D)', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Download <i className="fas fa-download"></i>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="partner-download-format" style={{ fontWeight: 600, color: '#334155' }}>Select Format</label>
            <select defaultValue="PDF Brochure" id="partner-download-format" style={{ padding: '0.8rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', cursor: 'pointer' }}>
              <option>PDF Brochure</option>
              <option>Technical Specification Sheet</option>
              <option>Case Study Document</option>
              <option>Full Documentation Package</option>
            </select>
          </div>
          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
            <input defaultChecked type="checkbox" style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
            Also send to my email
          </label>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
