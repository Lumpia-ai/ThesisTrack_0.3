import React from 'react';
import '@/styles/student-workspace.css';

export default function Loading() {
  return (
    <div className="page-body student-dashboard-page" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="shimmer-bg" style={{ height: '32px', width: '250px', borderRadius: '8px' }} />
        <div className="shimmer-bg" style={{ height: '16px', width: '400px', borderRadius: '6px' }} />
      </div>

      {/* Main Roadmap Skeleton */}
      <div className="shimmer-bg" style={{ height: '300px', width: '100%', borderRadius: '16px', border: '1px solid var(--border)' }} />

      {/* Bottom Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="shimmer-bg" style={{ height: '250px', borderRadius: '16px', border: '1px solid var(--border)' }} />
        <div className="shimmer-bg" style={{ height: '250px', borderRadius: '16px', border: '1px solid var(--border)' }} />
        <div className="shimmer-bg" style={{ height: '250px', borderRadius: '16px', border: '1px solid var(--border)' }} />
      </div>

    </div>
  );
}
