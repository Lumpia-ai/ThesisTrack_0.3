// Panel rating sheets for each defense stage, encoded as data so the live-defense
// screens, the scoring math, and the generated printable sheet all read from one
// definition. Source: the department's rating forms (Appendix E – Concept,
// Appendix F – Proposal, Appendix G – Final; public/rating_form_temp).
//
// When the department revises a form, edit the definition here and bump its
// `version` — saved Evaluation.rubricData records the version it was scored on.

export type RatingFormStage = 'concept' | 'proposal' | 'final';

// 'group' sections are scored once per panelist for the whole group;
// 'individual' sections are scored per student (the Individual Rating sheets).
export type RatingSectionScope = 'group' | 'individual';

export type RatingCriterion = {
  key: string;
  label: string;
  maxPoints: number;
  // Restricts input to fixed levels (Concept sheet: Beginning/Developing/
  // Accomplished/Exemplary). Omitted means any number from 0 to maxPoints.
  allowedPoints?: number[];
};

export type RatingSection = {
  key: string;
  label: string;
  scope: RatingSectionScope;
  // Share of the final grade this section is worth, e.g. 20 for "Manuscript (20%)".
  // Null when the sheet is graded on raw points (Concept).
  weightPercent: number | null;
  criteria: RatingCriterion[];
};

export type RatingVerdict = {
  key: 'approved' | 'denied' | 'reoral';
  label: string;
  description: string;
};

export type RatingForm = {
  stage: RatingFormStage;
  version: number;
  title: string;
  // DefenseSchedule.title values this form applies to.
  scheduleTypes: string[];
  sections: RatingSection[];
  // 'points' compares the raw point total; 'percent' compares the weighted total.
  passingBasis: 'points' | 'percent';
  maxTotal: number;
  passingMinimum: number;
  passVerdict: RatingVerdict;
  failVerdict: RatingVerdict;
};

const APPROVED_DESCRIPTION =
  'The Proponents/Researchers present an idea that potential to research based on the solid evidence gather.';
const FAILED_DESCRIPTION =
  'The Proponents/Researchers failed to present a possible researchable or scholarly Research / Special Project.';

const CONCEPT_LEVELS = [5, 10, 15, 20];

export const CONCEPT_RATING_LEVEL_LABELS: Record<number, string> = {
  5: 'Beginning',
  10: 'Developing',
  15: 'Accomplished',
  20: 'Exemplary'
};

export const RATING_FORMS: Record<RatingFormStage, RatingForm> = {
  concept: {
    stage: 'concept',
    version: 1,
    title: 'Concept Paper Presentation',
    scheduleTypes: ['Concept Presentation'],
    sections: [
      {
        key: 'concept',
        label: 'Concept Rating',
        scope: 'group',
        weightPercent: null,
        criteria: [
          { key: 'research-topic', label: 'Research Topic', maxPoints: 20, allowedPoints: CONCEPT_LEVELS },
          { key: 'literature', label: 'Relevant Literature and Related Existing Application', maxPoints: 20, allowedPoints: CONCEPT_LEVELS },
          { key: 'issues-gap', label: 'Issues and Gap', maxPoints: 20, allowedPoints: CONCEPT_LEVELS },
          { key: 'solutions-impact', label: 'Possible Solutions/Enhancement and Impact', maxPoints: 20, allowedPoints: CONCEPT_LEVELS },
          { key: 'overall-presentation', label: 'Overall Concept Presentation', maxPoints: 20, allowedPoints: CONCEPT_LEVELS }
        ]
      }
    ],
    passingBasis: 'points',
    maxTotal: 100,
    passingMinimum: 75,
    passVerdict: { key: 'approved', label: 'Approved', description: `${APPROVED_DESCRIPTION} 75 – 100 pts` },
    failVerdict: { key: 'denied', label: 'Denied', description: `${FAILED_DESCRIPTION} Below 75 pts.` }
  },
  proposal: {
    stage: 'proposal',
    version: 1,
    title: 'Project Proposal Presentation',
    scheduleTypes: ['Proposal Defense'],
    sections: [
      {
        key: 'manuscript',
        label: 'Project Proposal Manuscript',
        scope: 'group',
        weightPercent: 20,
        criteria: [
          { key: 'initial-pages', label: 'Initial Pages', maxPoints: 5 },
          { key: 'chapter-1', label: 'Chapter 1', maxPoints: 10 },
          { key: 'chapter-2', label: 'Chapter 2', maxPoints: 10 },
          { key: 'chapter-3', label: 'Chapter 3', maxPoints: 20 },
          { key: 'final-pages', label: 'Final Pages', maxPoints: 5 }
        ]
      },
      {
        key: 'prototype',
        label: 'Project Prototype',
        scope: 'group',
        weightPercent: 10,
        criteria: [
          { key: 'objectives-consistency', label: 'The output should be consistent with the objectives as defined during the concept stage', maxPoints: 25 },
          { key: 'delivered-modules', label: "Some modules and features of the system's output as defined after the proposal stage are delivered (credit based on the percentage of delivered items)", maxPoints: 25 }
        ]
      },
      {
        key: 'oral',
        label: 'Oral Examination',
        scope: 'individual',
        weightPercent: 20,
        criteria: [
          { key: 'mastery', label: 'Mastery of subject matters', maxPoints: 10 },
          { key: 'delivery', label: 'Delivery and Presentation of Idea', maxPoints: 5 },
          { key: 'answering', label: 'Ability to answer questions/defends ideas/receptiveness', maxPoints: 10 }
        ]
      }
    ],
    passingBasis: 'percent',
    maxTotal: 50,
    passingMinimum: 25,
    passVerdict: { key: 'approved', label: 'Approved', description: `${APPROVED_DESCRIPTION} 25 – 50 %` },
    failVerdict: { key: 'reoral', label: 'Re-oral', description: `${FAILED_DESCRIPTION} Below 25%.` }
  },
  final: {
    stage: 'final',
    version: 1,
    title: 'Final Defense Presentation',
    scheduleTypes: ['Final Defense'],
    sections: [
      {
        key: 'manuscript',
        label: 'Project Full-blown Manuscript',
        scope: 'group',
        weightPercent: 20,
        criteria: [
          { key: 'initial-pages', label: 'Initial Pages', maxPoints: 5 },
          { key: 'chapter-1', label: 'Chapter 1', maxPoints: 15 },
          { key: 'chapter-2', label: 'Chapter 2', maxPoints: 10 },
          { key: 'chapter-3', label: 'Chapter 3', maxPoints: 20 },
          { key: 'chapter-4', label: 'Chapter 4', maxPoints: 25 },
          { key: 'chapter-5-final-pages', label: 'Chapter 5 and Final Pages', maxPoints: 20 },
          { key: 'mechanics', label: 'Manuscript Mechanics', maxPoints: 5 }
        ]
      },
      {
        key: 'output',
        label: 'Project Output',
        scope: 'group',
        weightPercent: 20,
        criteria: [
          { key: 'objectives-consistency', label: 'The output should be consistent with the objectives as defined during the proposal stage', maxPoints: 40 },
          { key: 'delivered-modules', label: "All major modules and features of the system's output as defined after the proposal stage are delivered (credit based on the percentage of delivered items)", maxPoints: 40 },
          { key: 'coding-style', label: 'Coding Style', maxPoints: 20 }
        ]
      },
      {
        key: 'oral',
        label: 'Oral Examination',
        scope: 'individual',
        weightPercent: 10,
        criteria: [
          { key: 'mastery', label: 'Mastery of subject matters', maxPoints: 40 },
          { key: 'delivery', label: 'Delivery and Presentation of Idea', maxPoints: 40 },
          { key: 'answering', label: 'Ability to answer questions/defends ideas/receptiveness', maxPoints: 20 }
        ]
      }
    ],
    passingBasis: 'percent',
    maxTotal: 50,
    passingMinimum: 25,
    passVerdict: { key: 'approved', label: 'Approved', description: `${APPROVED_DESCRIPTION} 25 – 50 %` },
    failVerdict: { key: 'reoral', label: 'Re-oral', description: `${FAILED_DESCRIPTION} Below 25%.` }
  }
};

export function getRatingFormForScheduleType(scheduleType: string | null | undefined): RatingForm | null {
  const normalized = String(scheduleType ?? '').trim().toLowerCase();
  return Object.values(RATING_FORMS).find((form) =>
    form.scheduleTypes.some((type) => type.toLowerCase() === normalized)
  ) ?? null;
}

export function getSectionMaxPoints(section: RatingSection) {
  return section.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
}

// ---------------------------------------------------------------------------
// One panelist's filled sheet, as stored in Evaluation.rubricData.
// ---------------------------------------------------------------------------

export type RatingSheetScores = {
  stage: RatingFormStage;
  formVersion: number;
  // sectionKey -> criterionKey -> points
  group: Record<string, Record<string, number>>;
  // studentId -> sectionKey -> criterionKey -> points
  individual: Record<string, Record<string, Record<string, number>>>;
  sectionRemarks?: Record<string, string>;
  recommendations?: string;
};

export type RatingSheetValidationError = { path: string; message: string };

export function validateRatingSheet(
  form: RatingForm,
  scores: RatingSheetScores,
  studentIds: string[]
): RatingSheetValidationError[] {
  const errors: RatingSheetValidationError[] = [];

  const checkCriteria = (section: RatingSection, values: Record<string, number> | undefined, pathPrefix: string) => {
    for (const criterion of section.criteria) {
      const path = `${pathPrefix}.${criterion.key}`;
      const value = values?.[criterion.key];

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push({ path, message: `${criterion.label} is required.` });
      } else if (criterion.allowedPoints && !criterion.allowedPoints.includes(value)) {
        errors.push({ path, message: `${criterion.label} must be one of ${criterion.allowedPoints.join(', ')} pts.` });
      } else if (value < 0 || value > criterion.maxPoints) {
        errors.push({ path, message: `${criterion.label} must be between 0 and ${criterion.maxPoints} pts.` });
      }
    }
  };

  for (const section of form.sections) {
    if (section.scope === 'group') {
      checkCriteria(section, scores.group?.[section.key], `group.${section.key}`);
    } else {
      for (const studentId of studentIds) {
        checkCriteria(section, scores.individual?.[studentId]?.[section.key], `individual.${studentId}.${section.key}`);
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const round2 = (value: number) => Math.round(value * 100) / 100;

const sumPoints = (values: Record<string, number> | undefined) =>
  Object.values(values ?? {}).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

// A section's contribution to the total: weighted percent for 'percent' forms
// (points / max × weight, as in the sheets' "%" column), raw points otherwise.
function scoreSection(section: RatingSection, values: Record<string, number> | undefined) {
  const points = sumPoints(values);
  if (section.weightPercent === null) {
    return points;
  }
  return (points / getSectionMaxPoints(section)) * section.weightPercent;
}

export type StudentRatingResult = {
  studentId: string;
  // Individual-scope section scores for this student.
  individualScores: Record<string, number>;
  total: number;
  passed: boolean;
};

export type RatingSheetResult = {
  groupScores: Record<string, number>;
  // Per-student totals (group sections + that student's individual sections).
  students: StudentRatingResult[];
  // The Panel's Rating sheet total: group sections + the average of the
  // students' individual sections.
  total: number;
  passed: boolean;
};

function averageIndividualScore(students: StudentRatingResult[], sectionKey: string) {
  if (!students.length) return 0;
  return students.reduce((sum, student) => sum + (student.individualScores[sectionKey] ?? 0), 0) / students.length;
}

export function scoreRatingSheet(form: RatingForm, scores: RatingSheetScores, studentIds: string[]): RatingSheetResult {
  const groupSections = form.sections.filter((section) => section.scope === 'group');
  const individualSections = form.sections.filter((section) => section.scope === 'individual');

  const groupScores: Record<string, number> = {};
  for (const section of groupSections) {
    groupScores[section.key] = scoreSection(section, scores.group?.[section.key]);
  }
  const groupTotal = Object.values(groupScores).reduce((sum, value) => sum + value, 0);

  const students = studentIds.map((studentId) => {
    const individualScores: Record<string, number> = {};
    for (const section of individualSections) {
      individualScores[section.key] = scoreSection(section, scores.individual?.[studentId]?.[section.key]);
    }
    const total = groupTotal + Object.values(individualScores).reduce((sum, value) => sum + value, 0);
    return {
      studentId,
      individualScores: Object.fromEntries(Object.entries(individualScores).map(([key, value]) => [key, round2(value)])),
      total: round2(total),
      passed: total >= form.passingMinimum
    };
  });

  const total = groupTotal + individualSections.reduce(
    (sum, section) => sum + averageIndividualScore(students, section.key),
    0
  );

  return {
    groupScores: Object.fromEntries(Object.entries(groupScores).map(([key, value]) => [key, round2(value)])),
    students,
    total: round2(total),
    passed: total >= form.passingMinimum
  };
}

// Panel result for one defense: the average of every submitted panelist sheet.
export function aggregatePanelRatings(form: RatingForm, sheets: RatingSheetResult[]) {
  if (!sheets.length) {
    return null;
  }

  const average = (values: number[]) => round2(values.reduce((sum, value) => sum + value, 0) / values.length);
  const total = average(sheets.map((sheet) => sheet.total));
  const studentIds = sheets[0].students.map((student) => student.studentId);

  return {
    total,
    passed: total >= form.passingMinimum,
    verdict: total >= form.passingMinimum ? form.passVerdict : form.failVerdict,
    students: studentIds.map((studentId) => {
      const studentTotal = average(sheets.map((sheet) =>
        sheet.students.find((student) => student.studentId === studentId)?.total ?? 0
      ));
      return { studentId, total: studentTotal, passed: studentTotal >= form.passingMinimum };
    }),
    panelistCount: sheets.length
  };
}
