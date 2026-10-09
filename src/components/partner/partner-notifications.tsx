'use client';

import { useMemo, useState } from 'react';
import { PARTNER_NOTIFICATIONS, getPartnerStatusTone } from '@/components/partner/partner-data';
import { PartnerButton, PartnerModal, PartnerStatusBadge } from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';

export function PartnerNotifications() {
  const [filter, setFilter] = useState('All Notifications');
  const [notifications, setNotifications] = useState(() => [...PARTNER_NOTIFICATIONS]);
  const [selectedNotificationId, setSelectedNotificationId] = useState('');

  const visibleNotifications = useMemo(() => {
    if (filter === 'Unread Only') {
      return notifications.filter((item) => item.unread);
    }
    return notifications;
  }, [filter, notifications]);

  const selectedNotification =
    notifications.find((item) => item.id === selectedNotificationId) ?? notifications[0];

  return (
    <PartnerShell
      activeNav="notifications"
      title="Notifications"
      description="Stay updated on request status, MOA activity, and implementation actions"
      notificationCount={notifications.filter((item) => item.unread).length}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Filter and Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#64748B', fontWeight: 600, padding: '0 0.5rem' }}>
              <i className="fas fa-filter"></i> View
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', outline: 'none', cursor: 'pointer', fontWeight: 600, minWidth: '200px' }}>
              <option>All Notifications</option>
              <option>Unread Only</option>
            </select>
          </div>
          <button onClick={() => setNotifications((current) => current.map((item) => ({ ...item, unread: false })))} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
            <i className="fas fa-check-double"></i> Mark All as Read
          </button>
        </div>

        {/* Notification List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visibleNotifications.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '1.2rem', padding: '3rem 1.5rem', border: '1px solid #F1F5F9', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F8FAFC', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                <i className="fas fa-bell-slash"></i>
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontWeight: 700 }}>No Notifications</h3>
                <p style={{ margin: 0, color: '#64748B' }}>You're all caught up!</p>
              </div>
            </div>
          ) : (
            visibleNotifications.map((notification) => {
              const iconToneMap: Record<string, { icon: string, color: string, bg: string }> = {
                'Action Required': { icon: 'fa-exclamation-triangle', color: '#DC2626', bg: '#FEF2F2' },
                'Approval': { icon: 'fa-check-circle', color: '#16A34A', bg: '#DCFCE7' },
                'Update': { icon: 'fa-info-circle', color: '#003A8F', bg: '#EFF6FF' },
              };
              const toneData = iconToneMap[notification.tone] || { icon: 'fa-bell', color: '#64748B', bg: '#F1F5F9' };

              return (
                <article key={notification.id} style={{ background: notification.unread ? '#F8FAFC' : 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', gap: '1.5rem', border: '1px solid #E2E8F0', borderLeft: notification.unread ? '4px solid #003A8F' : '1px solid #E2E8F0', transition: 'transform 0.2s, box-shadow 0.2s', alignItems: 'flex-start' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 58, 143, 0.05)' }} onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)' }}>
                  
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: toneData.bg, color: toneData.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                    <i className={`fas ${toneData.icon}`}></i>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: notification.unread ? 800 : 600, color: '#0F172A', lineHeight: 1.3 }}>
                        {notification.title}
                        {notification.unread && <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3B82F6', borderRadius: '50%', marginLeft: '0.5rem', verticalAlign: 'middle' }}></span>}
                      </h3>
                      <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}><i className="far fa-clock" style={{ marginRight: '0.4rem' }}></i>{notification.timeLabel}</span>
                    </div>

                    <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
                      {notification.message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <PartnerStatusBadge tone={getPartnerStatusTone(notification.tone)}>{notification.tone}</PartnerStatusBadge>
                        {notification.actionLabel ? (
                          <span style={{ background: '#F1F5F9', color: '#475569', padding: '0.2rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #E2E8F0' }}>
                            {notification.actionLabel}
                          </span>
                        ) : null}
                      </div>
                      
                      <button onClick={() => {
                        setSelectedNotificationId(notification.id);
                        setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)));
                      }} style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#F8FAFC' }} onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}>
                        Open Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <PartnerModal
        open={Boolean(selectedNotificationId)}
        title={selectedNotification.title}
        onClose={() => setSelectedNotificationId('')}
        footer={
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
            <button onClick={() => setSelectedNotificationId('')} style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <PartnerStatusBadge tone={getPartnerStatusTone(selectedNotification.tone)}>{selectedNotification.tone}</PartnerStatusBadge>
            <span style={{ color: '#64748B', fontWeight: 600, fontSize: '0.9rem' }}><i className="far fa-clock" style={{ marginRight: '0.4rem' }}></i>{selectedNotification.timeLabel}</span>
          </div>
          
          <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: '0.8rem', border: '1px solid #E2E8F0' }}>
            <p style={{ margin: 0, color: '#0F172A', fontSize: '0.95rem', lineHeight: 1.6 }}>{selectedNotification.message}</p>
          </div>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
