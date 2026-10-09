'use client';

import { useMemo, useState } from 'react';
import {
  TECH_TRANSFER_NOTIFICATIONS,
  getTechTransferStatusTone
} from '@/components/tech-transfer/tech-transfer-data';
import {
  TechTransferButton,
  TechTransferModal,
  TechTransferStatusBadge
} from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

export function TechTransferNotifications() {
  const [filter, setFilter] = useState('All Notifications');
  const [notifications, setNotifications] = useState(() => [...TECH_TRANSFER_NOTIFICATIONS]);
  const [selectedNotificationId, setSelectedNotificationId] = useState('');

  const visibleNotifications = useMemo(() => {
    if (filter === 'Unread Only') {
      return notifications.filter((notification) => notification.unread);
    }

    return notifications;
  }, [filter, notifications]);

  const selectedNotification =
    notifications.find((notification) => notification.id === selectedNotificationId) ?? notifications[0];

  return (
    <TechTransferShell
      activeNav="notifications"
      title="Notifications"
      description="Monitor routing updates, deployment changes, and reporting reminders"
      notificationCount={notifications.filter((item) => item.unread).length}
    >
      <div className="filter-bar">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option>All Notifications</option>
          <option>Unread Only</option>
        </select>
        <TechTransferButton
          onClick={() =>
            setNotifications((current) => current.map((item) => ({ ...item, unread: false })))
          }
        >
          Mark All as Read
        </TechTransferButton>
      </div>

      <div className="notification-list">
        {visibleNotifications.map((notification) => (
          <article className={`notification-item${notification.unread ? ' unread' : ''}`} key={notification.id}>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
            <div className="notification-meta">
              <span>{notification.timeLabel}</span>
              <TechTransferStatusBadge tone={getTechTransferStatusTone(notification.tone)}>
                {notification.tone}
              </TechTransferStatusBadge>
            </div>
            <div className="card-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <TechTransferButton
                small
                onClick={() => {
                  setSelectedNotificationId(notification.id);
                  setNotifications((current) =>
                    current.map((item) =>
                      item.id === notification.id ? { ...item, unread: false } : item
                    )
                  );
                }}
              >
                Open
              </TechTransferButton>
              {notification.actionLabel ? <span className="pill">{notification.actionLabel}</span> : null}
            </div>
          </article>
        ))}
      </div>

      <TechTransferModal
        open={Boolean(selectedNotificationId)}
        title={selectedNotification.title}
        onClose={() => setSelectedNotificationId('')}
        footer={<TechTransferButton variant="primary" onClick={() => setSelectedNotificationId('')}>Close</TechTransferButton>}
      >
        <p>{selectedNotification.message}</p>
        <p className="inline-note">{selectedNotification.timeLabel}</p>
      </TechTransferModal>
    </TechTransferShell>
  );
}
