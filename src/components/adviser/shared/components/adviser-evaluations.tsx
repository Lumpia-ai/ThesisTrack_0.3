'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  DocumentFileList,
  DocumentFileUploadButton,
  type DocumentFileSummary
} from '@/components/documents/document-file-controls';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import {
  NAV_ITEMS,
  WORKSPACE_META,
  isNavItemActive,
  getShortName,
  getToastIcon
} from '@/components/adviser/shared/config/dashboard-utils';
import type { WorkspaceMode } from '@/components/adviser/shared/config/dashboard-utils';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import {
  ADVISER_EVALUATION_RECORDS,
  EVALUATION_DATE_FILTER_OPTIONS,
  PANEL_EVALUATION_RECORDS,
  calculateEvaluationScore,
  cloneEvaluationRecord,
  cloneEvaluationRecords,
  deriveStudentEvaluationRecommendation,
  matchesEvaluationDateFilter,
  type EvaluationDateFilter,
  type EvaluationRecommendation,
  type EvaluationRecord,
  type EvaluationStatus,
  type StudentEvaluationRecommendation
} from '@/components/adviser/shared/data/evaluation-workspace-data';
import {
  EvaluationList,
  EvaluationModal,
  EvaluationToolbar
} from '@/components/adviser/shared/data/evaluation-workspace-sections';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

type ToastType = 'success' | 'error' | 'info';

const PAGE_CONTENT = {
  adviser: {
    title: 'Evaluations',
    description: 'Track IT defense scoring status and adviser-side evaluation records in one workspace.'
  },
  panel: {
    title: 'Evaluation Queue',
    description: 'Score defense sessions and submit formal panel recommendation rubrics.'
  }
} as const;

function clampScore(value: number, maxScore: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(maxScore, Math.max(0, Math.round(value)));
}

function clampRubricMaxScore(value: number) {
  if (Number.isNaN(value)) {
    return 1;
  }

  return Math.min(50, Math.max(1, Math.round(value)));
}

export function AdviserEvaluations({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, pathname, basePath } = useWorkspaceMode();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<EvaluationStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<EvaluationDateFilter>('all');
  const [searchValue, setSearchValue] = useState('');
  const [adviserRecords, setAdviserRecords] = useState<EvaluationRecord[]>([]);
  const [panelRecords, setPanelRecords] = useState<EvaluationRecord[]>([]);
  const [draftRecord, setDraftRecord] = useState<EvaluationRecord | null>(null);
  const [readOnlyModal, setReadOnlyModal] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; type: ToastType } | null>(null);
  const [evaluationFile, setEvaluationFile] = useState<File | null>(null);
  const [evaluationFileProjectId, setEvaluationFileProjectId] = useState('');
  const [evaluationFiles, setEvaluationFiles] = useState<DocumentFileSummary[]>([]);
  const [evaluationFileError, setEvaluationFileError] = useState<string | null>(null);
  const [isEvaluationFileUploading, setIsEvaluationFileUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluationWorkspaceData() {
      const [evaluationsResult, filesResult] = await Promise.allSettled([
        fetch('/api/advisers/evaluations?limit=50'),
        fetch(`/api/document-files?bucketName=${DOCUMENT_STORAGE_BUCKETS.EVALUATION_FILES}&limit=50`, {
          cache: 'no-store'
        })
      ]);

      if (cancelled) {
        return;
      }

      if (evaluationsResult.status === 'fulfilled' && evaluationsResult.value.ok) {
        const payload = await evaluationsResult.value.json().catch(() => null);
        const evaluations = payload?.evaluations || [];
        setAdviserRecords(evaluations);
        setPanelRecords(evaluations);
      } else if (evaluationsResult.status === 'rejected') {
        console.error('Failed to load live evaluations:', evaluationsResult.reason);
      }

      if (filesResult.status === 'fulfilled' && filesResult.value.ok) {
        const payload = await filesResult.value.json().catch(() => null);
        setEvaluationFiles(payload?.files || []);
      }
    }

    void loadEvaluationWorkspaceData();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = draftRecord ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [draftRecord]);

  useEffect(() => {
    closeModal();
  }, [workspaceMode]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const meta = WORKSPACE_META[workspaceMode];
  const pageContent = PAGE_CONTENT[workspaceMode];
  const records = workspaceMode === 'adviser' ? adviserRecords : panelRecords;

  // Supports deep-linking straight to one evaluation (e.g. from the dashboard's
  // "Evaluate" quick action) via ?recordId=<Evaluation.id> once records have loaded.
  useEffect(() => {
    const recordId = searchParams.get('recordId');
    if (!recordId || !records.length) {
      return;
    }

    const target = records.find((record) => record.id === recordId);
    if (target) {
      openEvaluation(target, false);
    }
  }, [records, searchParams]);

  const evaluationFileProjectOptions = useMemo(
    () => records.map((record) => ({
      id: record.id,
      label: `${record.groupId} - ${record.projectTitle}`
    })),
    [records]
  );

  useEffect(() => {
    setEvaluationFileProjectId((current) => current || evaluationFileProjectOptions[0]?.id || '');
  }, [evaluationFileProjectOptions]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return records.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesDate = matchesEvaluationDateFilter(record, dateFilter);
      const matchesSearch =
        !normalizedSearch ||
        [
          record.projectTitle,
          record.groupId,
          record.department,
          record.evaluatorId,
          record.overallComments,
          record.students.join(' ')
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [dateFilter, records, searchValue, statusFilter]);

  // Status filter with counts; replaces the old summary cards (they only restated these numbers).
  const statusOptions = useMemo(() => {
    const countOf = (status: EvaluationStatus) => records.filter((record) => record.status === status).length;
    return [
      { value: 'all' as const, label: 'All', count: records.length },
      { value: 'pending' as const, label: 'Pending', count: countOf('pending') },
      { value: 'scheduled' as const, label: 'Scheduled', count: countOf('scheduled') },
      { value: 'overdue' as const, label: 'Overdue', count: countOf('overdue') },
      { value: 'completed' as const, label: 'Completed', count: countOf('completed') }
    ].filter((option) => option.value === 'all' || option.value === 'pending' || option.value === 'completed' || option.count > 0);
  }, [records]);

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFilter('all');
    setSearchValue('');
  };

  function showToast(message: string, type: ToastType = 'info') {
    const id = Date.now();
    setToast({ id, message, type });

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }

  function setRecordsForActiveMode(updater: (current: EvaluationRecord[]) => EvaluationRecord[]) {
    if (workspaceMode === 'adviser') {
      setAdviserRecords(updater);
      return;
    }

    setPanelRecords(updater);
  }

  function openEvaluation(record: EvaluationRecord, readOnly: boolean) {
    setDraftRecord(cloneEvaluationRecord(record));
    setReadOnlyModal(readOnly);
  }

  function closeModal() {
    setDraftRecord(null);
    setReadOnlyModal(false);
  }

  function handleCriterionScoreChange(criterionId: string, value: number) {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        rubric: current.rubric.map((criterion) =>
          criterion.id === criterionId
            ? { ...criterion, score: clampScore(value, criterion.maxScore) }
            : criterion
        )
      };
    });
  }

  function handleCriterionCommentChange(criterionId: string, value: string) {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        rubric: current.rubric.map((criterion) =>
          criterion.id === criterionId ? { ...criterion, comment: value } : criterion
        )
      };
    });
  }

  function handleCriterionLabelChange(criterionId: string, value: string) {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        rubric: current.rubric.map((criterion) =>
          criterion.id === criterionId ? { ...criterion, label: value } : criterion
        )
      };
    });
  }

  function handleCriterionMaxScoreChange(criterionId: string, value: number) {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        rubric: current.rubric.map((criterion) => {
          if (criterion.id !== criterionId) {
            return criterion;
          }

          const maxScore = clampRubricMaxScore(value);

          return {
            ...criterion,
            maxScore,
            score: clampScore(criterion.score, maxScore)
          };
        })
      };
    });
  }

  function handleAddCriterion() {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      const nextCriterionNumber = current.rubric.length + 1;

      return {
        ...current,
        rubric: [
          ...current.rubric,
          {
            id: `criterion-${Date.now()}-${nextCriterionNumber}`,
            label: `New Criterion ${nextCriterionNumber}`,
            maxScore: 10,
            score: 0,
            comment: ''
          }
        ]
      };
    });
  }

  function handleStudentCriterionScoreChange(studentId: string, criterionId: string, value: number) {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        studentEvaluations: current.studentEvaluations.map((studentEvaluation) =>
          studentEvaluation.id === studentId
            ? {
                ...studentEvaluation,
                rubric: studentEvaluation.rubric.map((criterion) =>
                  criterion.id === criterionId
                    ? { ...criterion, score: clampScore(value, criterion.maxScore) }
                    : criterion
                )
              }
            : studentEvaluation
        )
      };
    });
  }

  function handleStudentCommentChange(studentId: string, value: string) {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        studentEvaluations: current.studentEvaluations.map((studentEvaluation) =>
          studentEvaluation.id === studentId ? { ...studentEvaluation, comment: value } : studentEvaluation
        )
      };
    });
  }

  function handleStudentRecommendationChange(studentId: string, value: StudentEvaluationRecommendation) {
    setDraftRecord((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        studentEvaluations: current.studentEvaluations.map((studentEvaluation) =>
          studentEvaluation.id === studentId ? { ...studentEvaluation, recommendation: value } : studentEvaluation
        )
      };
    });
  }

  function handleOverallCommentsChange(value: string) {
    setDraftRecord((current) => (current ? { ...current, overallComments: value } : current));
  }

  function handleRecommendationChange(value: EvaluationRecommendation) {
    setDraftRecord((current) => (current ? { ...current, recommendation: value } : current));
  }

  async function submitEvaluation() {
    if (!draftRecord) {
      return;
    }

    if (!draftRecord.overallComments.trim()) {
      showToast('Add overall comments before submitting the evaluation.', 'error');
      return;
    }

    const normalizedRubric = draftRecord.rubric.map((criterion, index) => {
      const maxScore = clampRubricMaxScore(criterion.maxScore);

      return {
        ...criterion,
        label: criterion.label.trim() || `Criterion ${index + 1}`,
        maxScore,
        score: clampScore(criterion.score, maxScore),
        comment: criterion.comment.trim()
      };
    });

    const submittedAt = new Date().toISOString();
    const finalizedStudentEvaluations = draftRecord.studentEvaluations.map((studentEvaluation) => {
      const score = calculateEvaluationScore(studentEvaluation.rubric);

      return {
        ...studentEvaluation,
        score,
        recommendation: studentEvaluation.recommendation ?? deriveStudentEvaluationRecommendation(score)
      };
    });

    const finalizedRecord: EvaluationRecord = {
      ...draftRecord,
      rubric: normalizedRubric,
      score: calculateEvaluationScore(normalizedRubric),
      recommendation: draftRecord.recommendation ?? 'With Revision',
      studentEvaluations: finalizedStudentEvaluations,
      status: 'completed',
      submittedAt
    };

    try {
      const response = await fetch('/api/advisers/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizedRecord)
      });
      
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error || 'Failed to submit evaluation');
      }

      setRecordsForActiveMode((current) =>
        current.map((record) => (record.id === finalizedRecord.id ? finalizedRecord : record))
      );

      closeModal();
      showToast(
        `Evaluation submitted for ${finalizedRecord.groupId} with ${finalizedStudentEvaluations.length} student reviews.`,
        'success'
      );
    } catch (e: any) {
      showToast(e.message || 'An error occurred while submitting.', 'error');
    }
  }

  async function uploadEvaluationFile() {
    setEvaluationFileError(null);

    if (!evaluationFile) {
      setEvaluationFileError('Select an evaluation document before uploading.');
      return;
    }

    setIsEvaluationFileUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', evaluationFile);
      formData.append('bucketName', DOCUMENT_STORAGE_BUCKETS.EVALUATION_FILES);
      formData.append('projectId', evaluationFileProjectId);
      formData.append('documentCategory', 'evaluation');

      const response = await fetch('/api/document-files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to upload evaluation file.');
      }

      const payload = await response.json();
      setEvaluationFiles((current) => [payload.file, ...current]);
      setEvaluationFile(null);
      showToast('Evaluation file uploaded securely.', 'success');
    } catch (error) {
      setEvaluationFileError(error instanceof Error ? error.message : 'Unable to upload evaluation file.');
    } finally {
      setIsEvaluationFileUploading(false);
    }
  }

  async function openSignedDocument(file: DocumentFileSummary) {
    try {
      const response = await fetch(`/api/document-files/${file.id}/signed-url`, { method: 'POST' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to open the document.');
      }

      window.open(payload.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to open the document.', 'error');
    }
  }

  function downloadDocument(file: DocumentFileSummary) {
    window.open(`/api/document-files/${file.id}/download`, '_blank', 'noopener,noreferrer');
  }

  async function deleteEvaluationDocument(file: DocumentFileSummary) {
    try {
      const response = await fetch(`/api/document-files/${file.id}`, { method: 'DELETE' });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to delete the document.');
      }

      setEvaluationFiles((current) => current.filter((item) => item.id !== file.id));
      showToast('Evaluation file deleted.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete the document.', 'error');
    }
  }

  return (
    <>
        <AdviserPageHeader
          title={pageContent.title}
          description={pageContent.description}
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

        <div className="adviser-dash adviser-evals">
          <section className="adviser-dash-card adviser-groups-panel" aria-label="Evaluations">
            <EvaluationToolbar
              statusFilter={statusFilter}
              statusOptions={statusOptions}
              dateFilter={dateFilter}
              dateOptions={EVALUATION_DATE_FILTER_OPTIONS}
              searchValue={searchValue}
              resultCount={filteredRecords.length}
              totalCount={records.length}
              onStatusChange={setStatusFilter}
              onDateChange={setDateFilter}
              onSearchChange={setSearchValue}
              onClear={clearFilters}
            />
            <EvaluationList
              records={filteredRecords}
              onEvaluate={(record) => openEvaluation(record, false)}
              onViewScore={(record) => openEvaluation(record, true)}
            />
          </section>

          {/* Supporting documents: one compact panel below the evaluations instead of a hero above them. */}
          <section className="adviser-dash-card adviser-groups-panel adviser-eval-files" aria-labelledby="adviser-eval-files-title">
            <header className="adviser-queue-head">
              <h2 id="adviser-eval-files-title">Evaluation files</h2>
              <span className="adviser-dash-count">{evaluationFiles.length}</span>
              <span className="adviser-eval-files-note">
                <i className="fas fa-lock" aria-hidden="true" />
                Private, opened through signed links
              </span>
            </header>

            <div className="adviser-groups-toolbar adviser-eval-upload">
              <select
                className="adviser-groups-control is-select"
                aria-label="Attach to evaluation record"
                value={evaluationFileProjectId}
                onChange={(event) => setEvaluationFileProjectId(event.target.value)}
                disabled={isEvaluationFileUploading || !evaluationFileProjectOptions.length}
              >
                {evaluationFileProjectOptions.length ? (
                  evaluationFileProjectOptions.map((record) => (
                    <option key={record.id} value={record.id}>{record.label}</option>
                  ))
                ) : (
                  <option value="">No evaluation records</option>
                )}
              </select>
              <span className="adviser-eval-picked" title={evaluationFile?.name}>
                <i className={`fas ${evaluationFile ? 'fa-file-lines' : 'fa-file-circle-plus'}`} aria-hidden="true" />
                {evaluationFile ? evaluationFile.name : 'PDF, Word, PowerPoint or Excel'}
              </span>
              <div className="adviser-groups-toolbar-end">
                <DocumentFileUploadButton
                  bucketName={DOCUMENT_STORAGE_BUCKETS.EVALUATION_FILES}
                  disabled={isEvaluationFileUploading}
                  label={evaluationFile ? 'Replace file' : 'Choose file'}
                  onFileSelected={setEvaluationFile}
                  onError={setEvaluationFileError}
                />
                <button
                  className="adviser-subs-review"
                  type="button"
                  disabled={isEvaluationFileUploading || !evaluationFile || !evaluationFileProjectId}
                  onClick={uploadEvaluationFile}
                >
                  <i className={`fas ${isEvaluationFileUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} aria-hidden="true" />
                  {isEvaluationFileUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>

            <div className="adviser-eval-file-list">
              <DocumentFileList
                files={evaluationFiles}
                error={evaluationFileError}
                emptyMessage="No evaluation files uploaded yet."
                onView={openSignedDocument}
                onDownload={downloadDocument}
                onDelete={deleteEvaluationDocument}
              />
            </div>
          </section>
        </div>

        <EvaluationModal
          draft={draftRecord}
          readOnly={readOnlyModal}
          workspaceMode={workspaceMode}
          onAddCriterion={handleAddCriterion}
          onClose={closeModal}
          onCriterionCommentChange={handleCriterionCommentChange}
          onCriterionLabelChange={handleCriterionLabelChange}
          onCriterionMaxScoreChange={handleCriterionMaxScoreChange}
          onCriterionScoreChange={handleCriterionScoreChange}
          onStudentCommentChange={handleStudentCommentChange}
          onStudentCriterionScoreChange={handleStudentCriterionScoreChange}
          onStudentRecommendationChange={handleStudentRecommendationChange}
          onOverallCommentsChange={handleOverallCommentsChange}
          onRecommendationChange={handleRecommendationChange}
          onSubmit={submitEvaluation}
        />

        {toast ? (
          <div className="notification">
            <i
              className={`fas ${getToastIcon(toast.type)}`}
              style={{
                color:
                  toast.type === 'success'
                    ? 'var(--success)'
                    : toast.type === 'error'
                      ? 'var(--danger)'
                      : 'var(--primary)'
              }}
            />
            <span>{toast.message}</span>
          </div>
        ) : null}
      </>
  );
}
