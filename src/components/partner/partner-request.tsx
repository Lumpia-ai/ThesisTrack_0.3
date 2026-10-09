'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getPartnerTechnology } from '@/components/partner/partner-data';
import {
  PartnerButton,
  PartnerDepartmentBadge,
  PartnerModal
} from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';

export function PartnerRequest() {
  const searchParams = useSearchParams();
  const technology = getPartnerTechnology(searchParams.get('id'));
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <PartnerShell
      activeNav="request"
      title="Request Technology Adoption"
      description="Submit a formal request to adopt a thesis/capstone technology"
      notificationCount={2}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Technology Summary Card */}
        <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', borderTop: '4px solid #003A8F', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003A8F', fontSize: '2rem', flexShrink: 0 }}>
            <i aria-hidden="true" className={`fas ${technology.icon}`} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>{technology.title}</h2>
              <PartnerDepartmentBadge>{technology.department}</PartnerDepartmentBadge>
              <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '0.2rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700 }}>{technology.trl}</span>
            </div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.95rem', lineHeight: 1.5 }}>{technology.summary}</p>
          </div>
        </section>

        {/* Form Card */}
        <section style={{ background: 'white', borderRadius: '1.2rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Adoption Request Form</h3>
            <p style={{ margin: '0.2rem 0 0 0', color: '#64748B', fontSize: '0.9rem' }}>Please fill out the details below to initiate the adoption process.</p>
          </div>
          
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Section 1 */}
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#003A8F' }}></div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ background: '#EFF6FF', color: '#003A8F', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>1</span>
                Organization & Contact Details
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="partner-request-org" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Organization Name</label>
                  <input defaultValue="TechCorp Inc." id="partner-request-org" type="text" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="partner-request-contact" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Contact Person</label>
                  <input defaultValue="John Smith" id="partner-request-contact" type="text" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="partner-request-role" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Position / Title</label>
                  <input defaultValue="CTO" id="partner-request-role" type="text" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="partner-request-email" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Email Address</label>
                  <input defaultValue="john.smith@techcorp.com" id="partner-request-email" type="email" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="partner-request-phone" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Contact Number</label>
                  <input defaultValue="+63 917 123 4567" id="partner-request-phone" type="tel" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="partner-request-budget" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Budget Range (USD)</label>
                  <select defaultValue="$10,000 - $25,000" id="partner-request-budget" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}>
                    <option>$5,000 - $10,000</option>
                    <option>$10,000 - $25,000</option>
                    <option>$25,000 - $50,000</option>
                    <option>$50,000+</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#F6BE00' }}></div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ background: '#FEF9C3', color: '#B45309', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>2</span>
                Adoption Proposal
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label htmlFor="partner-request-plan" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Proposed Implementation Plan</label>
                <textarea
                  defaultValue="We plan to implement this technology in our main facility with an initial 3-month pilot before a phased rollout."
                  id="partner-request-plan"
                  rows={4}
                  style={{ padding: '1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', resize: 'vertical', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}
                  onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Expected Timeline</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input defaultValue="2026-05-01" type="date" style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
                  <span style={{ display: 'flex', alignItems: 'center', color: '#94A3B8' }}>to</span>
                  <input defaultValue="2026-08-01" type="date" style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="partner-request-extra" style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Additional Requirements</label>
                <textarea
                  defaultValue="We require API integration with our current ERP workflow and partner training for operations staff."
                  id="partner-request-extra"
                  rows={3}
                  style={{ padding: '1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', resize: 'vertical', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}
                  onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>
            </div>

            {/* Section 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#F8FAFC', padding: '1.5rem', borderRadius: '1rem', border: '1px dashed #CBD5E1' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
                <input defaultChecked type="checkbox" style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: '#003A8F', marginTop: '0.2rem' }} />
                <div>
                  <strong style={{ color: '#1E293B', display: 'block', fontSize: '0.95rem' }}>Accept Technology Transfer Terms</strong>
                  <span style={{ color: '#64748B', fontSize: '0.85rem' }}>I confirm that I have read and agree to the intellectual property and adoption terms of the university.</span>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: '#003A8F', marginTop: '0.2rem' }} />
                <div>
                  <strong style={{ color: '#1E293B', display: 'block', fontSize: '0.95rem' }}>Schedule Technical Demo</strong>
                  <span style={{ color: '#64748B', fontSize: '0.85rem' }}>I would like to request a live demonstration before the MOA is drafted.</span>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button onClick={() => setSubmitted(true)} style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '1rem 2.5rem', borderRadius: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 58, 143, 0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', transition: 'transform 0.1s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <i className="fas fa-paper-plane"></i> Submit Adoption Request
              </button>
              <button onClick={() => setDraftSaved(true)} style={{ background: 'white', color: '#003A8F', border: '1px solid #DBEAFE', padding: '1rem 2.5rem', borderRadius: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', fontSize: '1rem' }} onMouseOver={(e) => e.currentTarget.style.background = '#EFF6FF'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                Save as Draft
              </button>
            </div>
          </div>
        </section>
      </div>

      <PartnerModal
        open={draftSaved}
        title="Save as Draft"
        narrow
        onClose={() => setDraftSaved(false)}
        footer={
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
            <button onClick={() => setDraftSaved(false)} style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>OK</button>
          </div>
        }
      >
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>Your request has been saved as a draft. You can continue editing it later from My Requests.</p>
      </PartnerModal>

      <PartnerModal
        open={submitted}
        title="Request Submitted"
        narrow
        onClose={() => setSubmitted(false)}
        footer={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
            <button onClick={() => setSubmitted(false)} style={{ background: 'white', color: '#64748B', border: '1px solid #E2E8F0', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            <Link href="/partner/requests" style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Open My Requests
            </Link>
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            <i className="fas fa-check-circle"></i>
          </div>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
            Your adoption request for <strong style={{ color: '#0F172A' }}>{technology.title}</strong> has been successfully submitted to the technology transfer review queue. We will notify you once the initial assessment is complete.
          </p>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
