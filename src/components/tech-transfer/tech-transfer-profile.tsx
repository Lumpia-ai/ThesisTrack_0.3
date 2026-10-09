'use client';

import { useState } from 'react';
import { TECH_TRANSFER_PROFILE } from '@/components/tech-transfer/tech-transfer-data';
import { TechTransferButton, TechTransferModal } from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

export function TechTransferProfile() {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <TechTransferShell
      activeNav="profile"
      title="Profile"
      description="Manage technology transfer office contacts, scope, and portal preferences"
      notificationCount={2}
    >
      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-summary">
            <span className="profile-avatar-lg">
              <i aria-hidden="true" className="fas fa-building-columns" />
            </span>
            <h3 style={{ margin: 0 }}>{TECH_TRANSFER_PROFILE.coordinator}</h3>
            <p>{TECH_TRANSFER_PROFILE.role}</p>
            <span className="pill">{TECH_TRANSFER_PROFILE.officeName}</span>
            <TechTransferButton variant="primary" onClick={() => setEditOpen(true)}>
              Edit Profile
            </TechTransferButton>
          </div>
        </section>

        <section className="profile-card">
          <h3>Office Details</h3>
          <div className="detail-list">
            <p><strong>Email:</strong> {TECH_TRANSFER_PROFILE.email}</p>
            <p><strong>Phone:</strong> {TECH_TRANSFER_PROFILE.phone}</p>
            <p><strong>Office:</strong> {TECH_TRANSFER_PROFILE.office}</p>
            <p><strong>Scope:</strong> {TECH_TRANSFER_PROFILE.scope}</p>
          </div>
        </section>

        <section className="profile-card">
          <h3>Operations Summary</h3>
          <div className="detail-list">
            <p><strong>Managed Partners:</strong> {TECH_TRANSFER_PROFILE.managedPartners}</p>
            <p><strong>Active MOAs:</strong> {TECH_TRANSFER_PROFILE.activeMoas}</p>
            <p><strong>Successful Deployments:</strong> {TECH_TRANSFER_PROFILE.successfulDeployments}</p>
          </div>
        </section>
      </div>

      <div className="card-grid-two">
        <section className="profile-card">
          <h3>Portal Preferences</h3>
          <div className="setting-list">
            <div className="setting-item">
              <div>
                <strong>Email digests</strong>
                <p className="inline-note">Receive weekly deployment and MOA routing digests.</p>
              </div>
              <span className="pill">Enabled</span>
            </div>
            <div className="setting-item">
              <div>
                <strong>Priority alerts</strong>
                <p className="inline-note">Escalate approvals and stalled routing tasks to the office lead.</p>
              </div>
              <span className="pill">Enabled</span>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <h3>Office Notes</h3>
          <p>
            Use this portal to coordinate commercialization workflows, documentation releases, and post-deployment validation across partner sites.
          </p>
        </section>
      </div>

      <TechTransferModal
        open={editOpen}
        title="Edit Profile"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <TechTransferButton onClick={() => setEditOpen(false)}>Cancel</TechTransferButton>
            <TechTransferButton variant="primary" onClick={() => setEditOpen(false)}>
              Save Changes
            </TechTransferButton>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="tt-profile-name">Coordinator Name</label>
          <input defaultValue={TECH_TRANSFER_PROFILE.coordinator} id="tt-profile-name" />
        </div>
        <div className="form-group">
          <label htmlFor="tt-profile-email">Email</label>
          <input defaultValue={TECH_TRANSFER_PROFILE.email} id="tt-profile-email" />
        </div>
        <div className="form-group">
          <label htmlFor="tt-profile-phone">Phone</label>
          <input defaultValue={TECH_TRANSFER_PROFILE.phone} id="tt-profile-phone" />
        </div>
      </TechTransferModal>
    </TechTransferShell>
  );
}
