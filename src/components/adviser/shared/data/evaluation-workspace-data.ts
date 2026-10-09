export const EVALUATION_REFERENCE_DATE = '2026-04-14T00:00:00.000Z';

export type EvaluationStatus = 'pending' | 'scheduled' | 'completed' | 'overdue';
export type EvaluationRecommendation = 'Passed' | 'With Revision' | 'Failed';
export type StudentEvaluationRecommendation = 'Excellent' | 'Satisfactory' | 'Needs Support';
export type EvaluationDateFilter = 'all' | 'today' | 'this-week' | 'upcoming' | 'past';
export type EvaluationWorkspaceMode = 'adviser' | 'panel';

export type EvaluationRubricItem = {
  id: string;
  label: string;
  maxScore: number;
  score: number;
  comment: string;
};

export type StudentEvaluationCriterion = {
  id: string;
  label: string;
  maxScore: number;
  score: number;
};

export type StudentEvaluation = {
  id: string;
  studentName: string;
  score: number | null;
  recommendation: StudentEvaluationRecommendation | null;
  comment: string;
  rubric: StudentEvaluationCriterion[];
};

export type EvaluationRecord = {
  id: string;
  projectTitle: string;
  groupId: string;
  department: string;
  students: string[];
  defenseDate: string;
  status: EvaluationStatus;
  score: number | null;
  recommendation: EvaluationRecommendation | null;
  evaluatorId: string;
  overallComments: string;
  rubric: EvaluationRubricItem[];
  studentEvaluations: StudentEvaluation[];
  submittedAt: string | null;
};

type StudentEvaluationTemplate = {
  baseScores: [number, number, number, number];
  comment: string;
};

type EvaluationRecordSeed = Omit<EvaluationRecord, 'studentEvaluations'> & {
  studentEvaluationTemplate: StudentEvaluationTemplate;
};

export const EVALUATION_DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past Due Dates' }
] as const;

function buildRubric(
  scores: [number, number, number, number, number],
  comments: [string, string, string, string, string]
): EvaluationRubricItem[] {
  return [
    {
      id: 'problem-relevance',
      label: 'Problem Relevance',
      maxScore: 10,
      score: scores[0],
      comment: comments[0]
    },
    {
      id: 'methodology',
      label: 'Methodology',
      maxScore: 10,
      score: scores[1],
      comment: comments[1]
    },
    {
      id: 'system-implementation',
      label: 'System Implementation',
      maxScore: 10,
      score: scores[2],
      comment: comments[2]
    },
    {
      id: 'presentation',
      label: 'Presentation',
      maxScore: 10,
      score: scores[3],
      comment: comments[3]
    },
    {
      id: 'documentation',
      label: 'Documentation',
      maxScore: 10,
      score: scores[4],
      comment: comments[4]
    }
  ];
}

function buildStudentRubric(scores: [number, number, number, number]): StudentEvaluationCriterion[] {
  return [
    {
      id: 'participation',
      label: 'Participation',
      maxScore: 5,
      score: scores[0]
    },
    {
      id: 'technical-contribution',
      label: 'Technical Contribution',
      maxScore: 5,
      score: scores[1]
    },
    {
      id: 'communication',
      label: 'Communication',
      maxScore: 5,
      score: scores[2]
    },
    {
      id: 'documentation-ownership',
      label: 'Documentation Ownership',
      maxScore: 5,
      score: scores[3]
    }
  ];
}

function clampStudentCriterionScore(value: number) {
  return Math.max(0, Math.min(5, value));
}

export function calculateEvaluationScore<T extends { score: number; maxScore: number }>(rubric: T[]) {
  const totalScore = rubric.reduce((sum, criterion) => sum + criterion.score, 0);
  const totalPossible = rubric.reduce((sum, criterion) => sum + criterion.maxScore, 0);

  if (!totalPossible) {
    return 0;
  }

  return Math.round((totalScore / totalPossible) * 100);
}

export function deriveStudentEvaluationRecommendation(score: number): StudentEvaluationRecommendation {
  if (score >= 90) {
    return 'Excellent';
  }

  if (score >= 75) {
    return 'Satisfactory';
  }

  return 'Needs Support';
}

function buildStudentEvaluations(
  students: string[],
  template: StudentEvaluationTemplate,
  isCompleted: boolean
): StudentEvaluation[] {
  return students.map((student, index) => {
    const adjustedScores = template.baseScores.map((score, criterionIndex) => {
      const positiveOffset = (index + criterionIndex) % 3 === 0 ? 1 : 0;
      const negativeOffset = index % 2 === 1 && criterionIndex === 3 ? 1 : 0;
      return clampStudentCriterionScore(score + positiveOffset - negativeOffset);
    }) as [number, number, number, number];

    const rubric = buildStudentRubric(adjustedScores);
    const score = calculateEvaluationScore(rubric);

    return {
      id: `student-${index + 1}`,
      studentName: student,
      score: isCompleted ? score : null,
      recommendation: isCompleted ? deriveStudentEvaluationRecommendation(score) : null,
      comment: template.comment,
      rubric
    };
  });
}

function toEvaluationRecord({
  studentEvaluationTemplate,
  ...record
}: EvaluationRecordSeed): EvaluationRecord {
  return {
    ...record,
    studentEvaluations: buildStudentEvaluations(
      record.students,
      studentEvaluationTemplate,
      record.status === 'completed'
    )
  };
}

const adviserEvaluationRecordSeeds: EvaluationRecordSeed[] = [];
const panelEvaluationRecordSeeds: EvaluationRecordSeed[] = [];

export const ADVISER_EVALUATION_RECORDS: EvaluationRecord[] = [];
export const PANEL_EVALUATION_RECORDS: EvaluationRecord[] = [];

const evaluationStatusMeta: Record<
  EvaluationStatus,
  {
    label: string;
    badgeClassName: string;
    rowClassName: string;
    actionLabel: string;
    buttonClassName: string;
  }
> = {
  pending: {
    label: 'Pending',
    badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    rowClassName: 'bg-white',
    actionLabel: 'Open Evaluation',
    buttonClassName:
      'border border-[rgba(0,58,143,0.14)] bg-white text-[var(--primary)] hover:bg-[rgba(0,58,143,0.04)]'
  },
  scheduled: {
    label: 'Scheduled',
    badgeClassName: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    rowClassName: 'bg-white',
    actionLabel: 'Open Evaluation',
    buttonClassName:
      'border border-[rgba(0,58,143,0.14)] bg-white text-[var(--primary)] hover:bg-[rgba(0,58,143,0.04)]'
  },
  completed: {
    label: 'Completed',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    rowClassName: 'bg-white',
    actionLabel: 'View Result',
    buttonClassName:
      'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
  },
  overdue: {
    label: 'Overdue',
    badgeClassName: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    rowClassName: 'bg-rose-50/50',
    actionLabel: 'Open Evaluation',
    buttonClassName:
      'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
  }
};

const recommendationMeta: Record<
  EvaluationRecommendation,
  {
    className: string;
  }
> = {
  Passed: {
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
  },
  'With Revision': {
    className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
  },
  Failed: {
    className: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
  }
};

const studentRecommendationMeta: Record<
  StudentEvaluationRecommendation,
  {
    className: string;
  }
> = {
  Excellent: {
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
  },
  Satisfactory: {
    className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
  },
  'Needs Support': {
    className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
  }
};

const dayInMilliseconds = 1000 * 60 * 60 * 24;

function startOfUtcDay(value: string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function diffInDays(left: string, right: string) {
  return Math.round((startOfUtcDay(left) - startOfUtcDay(right)) / dayInMilliseconds);
}

export function cloneEvaluationRecord(record: EvaluationRecord): EvaluationRecord {
  return {
    ...record,
    students: [...record.students],
    rubric: record.rubric.map((criterion) => ({ ...criterion })),
    studentEvaluations: record.studentEvaluations.map((studentEvaluation) => ({
      ...studentEvaluation,
      rubric: studentEvaluation.rubric.map((criterion) => ({ ...criterion }))
    }))
  };
}

export function cloneEvaluationRecords(records: EvaluationRecord[]) {
  return records.map(cloneEvaluationRecord);
}

export function getEvaluationStatusMeta(status: EvaluationStatus) {
  return evaluationStatusMeta[status];
}

const fallbackRecommendationMeta = {
  className: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
};

export function getRecommendationMeta(recommendation: EvaluationRecommendation) {
  return recommendationMeta[recommendation] ?? fallbackRecommendationMeta;
}

export function getStudentEvaluationRecommendationMeta(recommendation: StudentEvaluationRecommendation) {
  return studentRecommendationMeta[recommendation];
}

export function formatEvaluationDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
}

export function formatEvaluationDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(new Date(value));
}

export function getStudentPreview(students: string[], maxVisible = 2) {
  const visibleStudents = students.slice(0, maxVisible);
  const remainingCount = Math.max(0, students.length - visibleStudents.length);

  if (!visibleStudents.length) {
    return 'No students listed';
  }

  const preview = visibleStudents.join(', ');
  return remainingCount ? `${preview} +${remainingCount}` : preview;
}

export function calculateStudentEvaluationCount(record: EvaluationRecord) {
  return record.studentEvaluations.filter((studentEvaluation) => studentEvaluation.score !== null).length;
}

export function matchesEvaluationDateFilter(
  record: EvaluationRecord,
  filter: EvaluationDateFilter,
  referenceDate = EVALUATION_REFERENCE_DATE
) {
  if (filter === 'all') {
    return true;
  }

  const dayDifference = diffInDays(record.defenseDate, referenceDate);

  if (filter === 'today') {
    return dayDifference === 0;
  }

  if (filter === 'this-week') {
    return dayDifference >= 0 && dayDifference <= 7;
  }

  if (filter === 'upcoming') {
    return dayDifference > 0;
  }

  return dayDifference < 0;
}

