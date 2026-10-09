'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { getToastIcon, NAV_ITEMS, WORKSPACE_META, isNavItemActive } from '@/components/adviser/shared/config/dashboard-utils';
import {
  buildAdviserReportsModule,
  buildReportsCsv,
  REPORT_DATE_RANGE_OPTIONS,
  REPORT_STATUS_OPTIONS,
  REPORT_TYPE_OPTIONS,
  type ReportDateRange,
  type ReportStatusFilter,
  type ReportType
} from '@/components/adviser/shared/data/report-workspace-data';
import {
  ReportCompletedProjects,
  ReportEvaluationCard,
  ReportProgressCard,
  ReportSupervisionCard,
  ReportToolbar
} from '@/components/adviser/shared/data/report-workspace-sections';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

type ToastState = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

export function AdviserReports({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, pathname, basePath } = useWorkspaceMode();
  const [dateRange, setDateRange] = useState<ReportDateRange>('current-cycle');
  const [reportType, setReportType] = useState<ReportType>('all');
  const [status, setStatus] = useState<ReportStatusFilter>('all');
  const [toast, setToast] = useState<ToastState | null>(null);
  const meta = WORKSPACE_META[workspaceMode];

  const reportModule = useMemo(() => buildAdviserReportsModule(data, { dateRange, status }), [data, dateRange, status]);
  const hasActiveFilters = dateRange !== 'current-cycle' || reportType !== 'all' || status !== 'all';
  const awaitingFeedbackMetric = reportModule.summaryMetrics.find((metric) => metric.id === 'progress-reports-awaiting-feedback');
  const awaitingFeedback = awaitingFeedbackMetric ? Number(awaitingFeedbackMetric.value) || 0 : null;

  const showEvaluation = reportType === 'all' || reportType === 'evaluation';
  const showProgress = reportType === 'all' || reportType === 'progress';
  const showCompletedProjects = reportType === 'all' || reportType === 'completed-projects';
  const showSupervision = reportType === 'all' || reportType === 'supervision';

  function clearFilters() {
    setDateRange('current-cycle');
    setReportType('all');
    setStatus('all');
  }

  function showToast(message: string, type: ToastState['type'] = 'info') {
    const id = Date.now();
    setToast({ id, message, type });

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }

  function handleExport() {
    const csv = buildReportsCsv(reportModule);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adviser-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Report exported as CSV.', 'success');
  }

  return (
    <>
        <AdviserPageHeader
          title="Reports & Analytics"
          description="Generate summaries for tracking deliverables, evaluation results, and supervision activity."
          actions={
            <AdviserShellActions
              basePath={basePath}
              fullName={data.profile.fullName}
              notificationCount={data.profile.notificationCount}
              workspaceMode={workspaceMode}
              onSwitchWorkspace={switchWorkspace}
            />
          }
        />

        <div className="adviser-dash adviser-reports">
          <ReportToolbar
            dateRange={dateRange}
            reportType={reportType}
            status={status}
            dateOptions={REPORT_DATE_RANGE_OPTIONS}
            reportTypeOptions={REPORT_TYPE_OPTIONS}
            statusOptions={REPORT_STATUS_OPTIONS}
            hasActiveFilters={hasActiveFilters}
            onDateRangeChange={setDateRange}
            onReportTypeChange={setReportType}
            onStatusChange={setStatus}
            onClearFilters={clearFilters}
            onExport={handleExport}
          />

          {/* Each section carries its own headline numbers, so there is no separate summary-card row. */}
          {showProgress || showEvaluation || showSupervision ? (
            <div className="adviser-report-grid">
              {showProgress ? <ReportProgressCard summary={reportModule.progressSummary} awaitingFeedback={awaitingFeedback} /> : null}
              {showEvaluation ? (
                <ReportEvaluationCard summary={reportModule.evaluationSummary} pendingEvaluations={reportModule.pendingEvaluations} />
              ) : null}
              {showSupervision ? <ReportSupervisionCard summary={reportModule.supervisionSummary} /> : null}
            </div>
          ) : null}

          {showCompletedProjects ? (
            <ReportCompletedProjects projects={reportModule.completedProjects} viewAllHref={`${basePath}/groups`} />
          ) : null}
        </div>

        {toast ? (
          <div
            className={`fixed bottom-6 right-6 z-[140] flex min-w-[280px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] ${
              toast.type === 'success'
                ? 'bg-emerald-600'
                : toast.type === 'error'
                  ? 'bg-rose-600'
                  : 'bg-[var(--primary)]'
            }`}
            role="status"
          >
            <i aria-hidden="true" className={`fas ${getToastIcon(toast.type)}`} />
            <span>{toast.message}</span>
          </div>
        ) : null}
      </>
  );
}
