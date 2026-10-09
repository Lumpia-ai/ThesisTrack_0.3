'use client';

import Link from 'next/link';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { NAV_ITEMS, WORKSPACE_META, isNavItemActive } from '@/components/adviser/shared/config/dashboard-utils';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import type { PortalNotificationItem } from '@/components/shared/portal-shell-action-menus';
import { isBackupTitleNotification } from '@/lib/notification-tags';

export type AdviserNotificationRecord = {
  id: string;
  status: string;
  created_at: string;
  icon: string;
  title: string;
  text: string;
  time: string;
  href: string;
  meta: string;
  entityType?: string | null;
  tone: PortalNotificationItem['tone'];
};

export function AdviserNotifications({
  data,
  notifications
}: {
  data: AdviserDashboardData;
  notifications?: AdviserNotificationRecord[];
}) {
  const { workspaceMode, switchWorkspace, pathname, basePath } = useWorkspaceMode();
  const meta = WORKSPACE_META[workspaceMode];
  const fallbackItems = workspaceMode === 'adviser' ? data.adviserActivity : data.panelActivity;
  const items = notifications ?? fallbackItems;
  const notificationPreviewItems: PortalNotificationItem[] | undefined = notifications?.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.text,
    href: item.href,
    icon: item.icon,
    meta: item.meta,
    tone: item.tone,
    unread: item.status !== 'read',
    actionLabel: 'Open',
    tag: isBackupTitleNotification(item.title) ? 'Backup' : undefined
  }));

  const markNotificationRead = (notificationId: string) => {
    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, action: 'read' }),
      keepalive: true
    }).finally(() => {
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    });
  };

  return (
    <>
        <AdviserPageHeader
          title="Notifications"
          description="System alerts and activity logs."
          actions={
            <AdviserShellActions
              basePath={basePath}
              fullName={data.profile.fullName}
              notificationCount={data.profile.notificationCount}
              notificationItems={notificationPreviewItems}
              userId={data.profile.user_id}
              workspaceMode={workspaceMode}
              onSwitchWorkspace={switchWorkspace}
            />
          }
        />

        <div className="w-full max-w-[1600px] mt-8 pb-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/60 pb-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
                  <i className="fas fa-bell text-lg" />
                </span>
                Activity Feed
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">Review alerts, updates, and track the latest student submissions.</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-1.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200/50">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
                {items.filter(i => i.status !== 'read').length} Unread Alerts
              </span>
            </div>
          </div>

          <div className="space-y-4 relative">
            {/* Subtle background line to connect timeline items visually */}
            <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-gradient-to-b from-slate-100 via-slate-200 to-transparent hidden sm:block z-0" />

            {items.length ? (
              items.map((item, idx) => {
                const isUnread = item.status !== 'read';
                const IconWrapperBg = 'tone' in item && item.tone === 'success'
                  ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 ring-emerald-200'
                  : 'tone' in item && item.tone === 'danger'
                  ? 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600 ring-rose-200'
                  : 'tone' in item && item.tone === 'warning'
                  ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 ring-amber-200'
                  : 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 ring-blue-200';

                return (
                  <article 
                    key={item.id} 
                    className={`group relative flex flex-col sm:flex-row gap-6 rounded-[24px] p-5 transition-all duration-300 z-10 ${
                      isUnread 
                        ? 'bg-white shadow-[0_8px_30px_rgb(0,58,143,0.06)] ring-1 ring-blue-100/80 hover:shadow-[0_20px_40px_rgb(0,58,143,0.12)] hover:-translate-y-1' 
                        : 'bg-slate-50/50 hover:bg-white border border-slate-200/60 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {isUnread && (
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                    )}
                    
                    <div className="flex shrink-0 items-start pt-1">
                      <div className={`relative flex h-14 w-14 items-center justify-center rounded-[18px] shadow-sm ring-1 ring-inset ${IconWrapperBg}`}>
                        <i className={`fas ${item.icon} text-xl`} />
                        {isUnread && (
                           <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white shadow-sm" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <h4 className={`text-[1.05rem] font-bold leading-tight transition-colors ${isUnread ? 'text-slate-900 group-hover:text-blue-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                              {'href' in item && item.href ? (
                                 <Link href={item.href} prefetch={false} onClick={() => markNotificationRead(item.id)} className="focus:outline-none before:absolute before:inset-0 before:z-10 before:rounded-[24px]">
                                   {item.title}
                                 </Link>
                              ) : (
                                 item.title
                              )}
                            </h4>
                            {isBackupTitleNotification(item.title) && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-300">
                                Backup
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white px-3 py-1.5 rounded-full ring-1 ring-slate-200 shadow-sm z-20">
                            <i className="fas fa-clock text-slate-400" /> {item.time}
                          </span>
                       </div>
                       
                       <p className={`text-sm leading-relaxed max-w-3xl ${isUnread ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                         {item.text}
                       </p>
                       
                       <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                         {'meta' in item && item.meta && (
                           <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                             <i className="fas fa-hashtag text-slate-400" />
                             {item.meta}
                           </span>
                         )}
                         
                         <div className="flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {'href' in item && item.href && (
                               <Link 
                                 href={item.href} 
                                 prefetch={false}
                                 onClick={() => markNotificationRead(item.id)}
                                 className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[var(--primary)] shadow-sm ring-1 ring-slate-200 hover:bg-blue-50 hover:ring-blue-200 hover:text-blue-700 transition-all"
                               >
                                 View Details <i className="fas fa-arrow-right" />
                               </Link>
                            )}
                            {isUnread && (
                               <button 
                                 type="button" 
                                 onClick={() => markNotificationRead(item.id)}
                                 className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 ring-1 ring-slate-200 hover:ring-emerald-200 shadow-sm transition-all tooltip"
                                 title="Mark as read"
                               >
                                 <i className="fas fa-check" />
                               </button>
                            )}
                         </div>
                       </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-gradient-to-b from-slate-50/50 to-white px-6 py-24 text-center shadow-sm">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-slate-100 mb-6 group hover:scale-105 transition-transform duration-500">
                  <div className="absolute inset-0 rounded-3xl bg-blue-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <i aria-hidden="true" className="fas fa-check-double text-4xl text-emerald-500" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800">You're all caught up!</h3>
                <p className="mt-3 text-sm text-slate-500 max-w-md leading-relaxed font-medium">
                  There are no pending alerts or unread notifications at this time. When students submit new documents or reach a new project stage, they will appear right here.
                </p>
                <Link href="/advisers/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all">
                  <i className="fas fa-arrow-left" /> Back to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </>
  );
}
