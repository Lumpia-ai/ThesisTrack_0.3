'use client';

import { useMemo, useState } from 'react';
import {
  PROGRAM_HEAD_NOTIFICATIONS,
  type ProgramHeadNotification
} from '@/components/program-head/program-head-data';
import {
  ProgramHeadButton,
  ProgramHeadModal,
  ProgramHeadStatCard
} from '@/components/program-head/program-head-primitives';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';

const ICON_COLORS: Record<string, string> = {
  primary: 'bg-[#003a8f] text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-500 text-white',
  success: 'bg-emerald-500 text-white',
  info: 'bg-blue-500 text-white'
};

export function ProgramHeadNotifications() {
  const [notifications, setNotifications] = useState<ProgramHeadNotification[]>(() => PROGRAM_HEAD_NOTIFICATIONS.map(item => ({ ...item })));
  const [filter, setFilter] = useState('All Notifications');
  const [sendOpen, setSendOpen] = useState(false);

  const visibleNotifications = useMemo(() => {
    if (filter === 'All Notifications') return notifications;
    return notifications.filter(item => item.category === filter);
  }, [filter, notifications]);

  const unreadCount = notifications.filter(item => item.unread).length;
  const thisWeekCount = 6;
  const actionRequiredCount = notifications.filter(item => item.unread && item.actionLabel).length;

  const markRead = (id: string) => {
    setNotifications(current => current.map(item => (item.id === id ? { ...item, unread: false, actionLabel: undefined } : item)));
  };
  const markAllRead = () => {
    setNotifications(current => current.map(item => ({ ...item, unread: false, actionLabel: undefined })));
  };

  return (
    <ProgramHeadShell activeNav="notifications" title="Notifications" description="Department-level approvals, adviser follow-ups, and transfer endorsements." notificationCount={unreadCount}>
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Category</label>
            <select className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors" value={filter} onChange={e => setFilter(e.target.value)}>
              <option>All Notifications</option><option>Title Approvals</option><option>At-Risk Projects</option><option>Faculty Follow-up</option><option>Transfer Alerts</option>
            </select>
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button onClick={markAllRead} className="h-11 px-4 rounded-xl bg-slate-50 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2">
              <i className="fas fa-check-double text-xs"></i> Mark All Read
            </button>
            <button onClick={() => setSendOpen(true)} className="h-11 px-6 bg-[#003a8f] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-900/20 hover:bg-[#002c6b] hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <i className="fas fa-paper-plane"></i> Send to Faculty
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ProgramHeadStatCard title="Unread" value={unreadCount} note="Pending review" icon="fas fa-envelope" />
        <ProgramHeadStatCard title="This Week" value={thisWeekCount} note="Recent activity" icon="fas fa-calendar-week" />
        <ProgramHeadStatCard title="Action Required" value={actionRequiredCount} note="Needs your response" icon="fas fa-bell" />
      </div>

      {/* Notification Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 m-0 flex items-center gap-2"><i className="fas fa-stream text-[#003a8f]"></i> Notification Feed</h3>
          <p className="text-sm text-slate-500 m-0 mt-1">{visibleNotifications.length} notifications shown.</p>
        </div>
        <div className="divide-y divide-slate-50">
          {visibleNotifications.length === 0 ? (
            <div className="py-16 text-center">
              <i className="fas fa-bell-slash text-4xl text-slate-200 mb-3 block"></i>
              <p className="text-slate-500 font-medium m-0">No notifications in this category.</p>
            </div>
          ) : visibleNotifications.map(item => (
            <div key={item.id} className={`flex items-start gap-4 px-6 py-5 transition-all hover:bg-blue-50/30 ${item.unread ? 'bg-blue-50/20' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${ICON_COLORS[item.iconTone] || 'bg-slate-200 text-slate-500'}`}>
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-slate-800">{item.title}</strong>
                    {item.unread && <span className="w-2 h-2 rounded-full bg-[#003a8f] shrink-0"></span>}
                  </div>
                  {item.actionLabel && (
                    <button
                      onClick={() => markRead(item.id)}
                      className={`shrink-0 h-8 px-4 rounded-lg text-xs font-bold transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        item.category === 'Transfer Alerts' ? 'bg-slate-100 text-slate-700 hover:bg-[#003a8f] hover:text-white' : 'bg-[#003a8f] text-white'
                      }`}
                    >
                      {item.actionLabel}
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 m-0 mb-1">{item.message}</p>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <i className="fas fa-clock text-[9px]"></i> {item.timeLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Send Modal */}
      <ProgramHeadModal open={sendOpen} title="Send Department Notification" onClose={() => setSendOpen(false)}>
        <div className="ph-form-field"><label htmlFor="ph-notification-recipient">Recipients</label>
          <select className="ph-select" id="ph-notification-recipient" defaultValue="All Faculty (IT Department)">
            <option>All Faculty (IT Department)</option><option>All Advisers</option><option>Department Chairs</option><option>Selected Faculty</option>
          </select>
        </div>
        <div className="ph-form-field"><label htmlFor="ph-notification-priority">Priority</label>
          <select className="ph-select" id="ph-notification-priority" defaultValue="Normal"><option>Normal</option><option>Important</option><option>Urgent</option></select>
        </div>
        <div className="ph-form-field"><label htmlFor="ph-notification-subject">Subject</label><input className="ph-input" id="ph-notification-subject" placeholder="Notification subject" /></div>
        <div className="ph-form-field"><label htmlFor="ph-notification-message">Message</label><textarea className="ph-textarea" id="ph-notification-message" rows={5} /></div>
        <div className="ph-modal-actions">
          <ProgramHeadButton onClick={() => setSendOpen(false)}>Cancel</ProgramHeadButton>
          <ProgramHeadButton variant="primary" onClick={() => setSendOpen(false)}>Send</ProgramHeadButton>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
