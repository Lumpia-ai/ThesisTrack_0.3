'use client';

import { useState } from 'react';
import {
  LIBRARY_NOTIFICATIONS,
  type LibraryNotification
} from '@/components/library/library-data';
import { LibraryShell } from '@/components/library/library-shell';

export function LibraryNotifications() {
  const [activeFilter, setActiveFilter] = useState<'all' | LibraryNotification['category']>('all');
  const [notifications, setNotifications] = useState([...LIBRARY_NOTIFICATIONS]);

  const visibleNotifications = notifications.filter((notification) =>
    activeFilter === 'all' ? true : notification.category === activeFilter
  );

  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const thisWeekCount = notifications.length;

  return (
    <LibraryShell
      activeNav="notifications"
      notificationCount={unreadCount}
      title="Notifications"
      description="Repository updates and digest alerts for the digital library workspace."
      hideHeader={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
        
        {/* Header & Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'end' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0F172A', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Notifications</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: '1.1rem' }}>Stay updated with new publications and repository digests.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem 1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF9E6', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><i className="fas fa-bell"></i></div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unread</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{unreadCount}</div>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem 1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', color: '#003A8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><i className="fas fa-calendar-week"></i></div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Week</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{thisWeekCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.2rem 1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.95rem' }}>Filter by:</span>
            <select
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.6rem 1.2rem', borderRadius: '0.8rem', fontWeight: 600, color: '#0F172A', outline: 'none', cursor: 'pointer' }}
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | LibraryNotification['category'])}
            >
              <option value="all">All Notifications</option>
              <option value="New Publications">New Publications</option>
              <option value="Repository Updates">Repository Updates</option>
              <option value="Research Insights Digest">Research Insights Digest</option>
            </select>
          </div>

          <button
            style={{ background: '#EFF6FF', color: '#003A8F', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.8rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setNotifications((current) => current.map((n) => ({ ...n, unread: false })))}
            onMouseOver={(e) => { e.currentTarget.style.background = '#003A8F'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#003A8F'; }}
          >
            <i className="fas fa-check-double"></i> Mark All as Read
          </button>
        </section>

        {/* Notifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visibleNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '1.2rem', border: '2px dashed #E2E8F0' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: '#F8FAFC', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 1.5rem auto' }}>
                <i className="fas fa-bell-slash"></i>
              </div>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.2rem' }}>No notifications found</h3>
              <p style={{ color: '#64748B', marginTop: '0.5rem' }}>You're all caught up!</p>
            </div>
          ) : (
            visibleNotifications.map((notification) => (
              <article
                key={notification.id}
                style={{
                  background: notification.unread ? '#F8FAFC' : 'white',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  boxShadow: '0 4px 15px rgba(0, 58, 143, 0.03)',
                  border: `1px solid ${notification.unread ? '#BFDBFE' : '#F1F5F9'}`,
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'flex-start',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 58, 143, 0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 58, 143, 0.03)'; }}
              >
                {notification.unread && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#003A8F' }} />
                )}
                
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                  background: notification.tone === 'success' ? '#DCFCE7' : notification.tone === 'warning' ? '#FEF9E6' : notification.tone === 'muted' ? '#F1F5F9' : '#EFF6FF',
                  color: notification.tone === 'success' ? '#16A34A' : notification.tone === 'warning' ? '#D97706' : notification.tone === 'muted' ? '#64748B' : '#003A8F'
                }}>
                  <i className={`fas ${notification.icon}`} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{notification.title}</strong>
                      {notification.unread && (
                        <span style={{ background: '#FEF9E6', color: '#D97706', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New</span>
                      )}
                    </div>
                    <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}><i className="far fa-clock"></i> {notification.timeLabel}</span>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>{notification.message}</p>
                  
                  {notification.unread && (
                    <button
                      style={{ background: 'transparent', color: '#003A8F', border: '1px solid #003A8F', padding: '0.4rem 1rem', borderRadius: '0.6rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => setNotifications((current) => current.map((n) => n.id === notification.id ? { ...n, unread: false } : n))}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#003A8F'; e.currentTarget.style.color = 'white'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#003A8F'; }}
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

      </div>
    </LibraryShell>
  );
}
