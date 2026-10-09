/*
 * Sample data for Accreditation & Evidence Management, so every view (group folders,
 * evidence types, statuses, duplicates, coverage gaps) can be seen without real uploads.
 * Everything is flagged `isSample`. Each file gets a drawn "scan" of the document it
 * represents (see program-head-evidence-documents.ts): no network, never sent to the API.
 * The dashboard's Evidence gauge only ever uses real files.
 */
import type { ApiDocumentFile, ApiGroupMember, ApiReviewComment, GroupRow } from '@/components/program-head/program-head-evidence';
import { renderSampleDocument, type SampleDocSpec } from '@/components/program-head/program-head-evidence-documents';

export const SAMPLE_EVIDENCE_PREFIX = 'DEMO-';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const dateLabel = (days: number) => new Date(Date.now() - days * 86_400_000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const members = (...names: string[]): ApiGroupMember[] =>
  names.map((name, index) => ({ name, role: index === 0 ? 'Leader' : 'Member', isLeader: index === 0 }));

const comment = (id: string, decision: string, body: string, authorName: string, days: number): ApiReviewComment =>
  ({ id, decision, body, authorName, createdAt: daysAgo(days) });

type SampleGroup = { code: string; title: string; adviser: string; team: ApiGroupMember[]; progress: number; stage: string };

const GROUPS: SampleGroup[] = [
  { code: 'DEMO-EV-01', title: 'Campus Lost-and-Found Portal with Image Matching', adviser: 'Dr. Elena Santos', team: members('Ana Lim', 'Ben Ortiz', 'Cara Sy'), progress: 96, stage: 'Final Defense' },
  { code: 'DEMO-EV-02', title: 'Clinic Queue Management System with SMS Alerts', adviser: 'Dr. Paolo Navarro', team: members('Dan Uy', 'Eve Tan', 'Finn Go', 'Gia Co'), progress: 62, stage: 'Development' },
  { code: 'DEMO-EV-03', title: 'Adaptive Quiz Generator for Senior High Science', adviser: 'Engr. Mark Villanueva', team: members('Nia Sy', 'Omar Lao', 'Pia Tiu'), progress: 78, stage: 'Pre-Final Defense' },
  { code: 'DEMO-EV-04', title: 'Barangay Document Request and Tracking System', adviser: 'Prof. Grace Dela Cruz', team: members('Kai Ong', 'Lia Dy', 'Max Chua'), progress: 45, stage: 'Proposal Defense' },
  { code: 'DEMO-EV-05', title: 'Crop Disease Detection Using Leaf Images', adviser: 'Prof. Liza Mendoza', team: members('Wes Lu', 'Xia Ng', 'Yen Po'), progress: 30, stage: 'Concept' },
  { code: 'DEMO-EV-06', title: 'Smart Parking Slot Finder', adviser: 'Dr. Carlo Bautista', team: members('Bea Sy', 'Cal Uy', 'Dee Go'), progress: 12, stage: 'Concept' }
];

const byCode = Object.fromEntries(GROUPS.map((group) => [group.code, group])) as Record<string, SampleGroup>;
const projectIdOf = (code: string) => `sample-project-${code}`;
const namesOf = (group: SampleGroup) => group.team.map((member) => member.name);

/* Document specs, filled in from the group so every page carries its real title, names and dates. */
const doc = {
  application: (group: SampleGroup, stage: string, days: number, decision: 'approved' | 'revision' | 'pending'): SampleDocSpec =>
    ({ type: 'application', stage, group: group.code, title: group.title, adviser: group.adviser, members: namesOf(group), date: dateLabel(days), decision }),
  results: (group: SampleGroup, heading: string, rows: Array<[string, number]>, remark: string, days: number): SampleDocSpec =>
    ({ type: 'results', heading, group: group.code, title: group.title, rows, remark, date: dateLabel(days) }),
  manuscript: (group: SampleGroup, days: number): SampleDocSpec =>
    ({ type: 'manuscript', title: group.title, authors: namesOf(group), adviser: group.adviser, date: dateLabel(days).replace(/ \d+,/, '') }),
  certificate: (group: SampleGroup, heading: string, event: string, days: number): SampleDocSpec =>
    ({ type: 'certificate', heading, recipients: namesOf(group), event, date: dateLabel(days) }),
  activity: (group: SampleGroup, event: string, venue: string, days: number): SampleDocSpec =>
    ({ type: 'activity', event, venue, group: group.code, attendees: namesOf(group), date: dateLabel(days) }),
  letter: (heading: string, to: string, subject: string, days: number): SampleDocSpec =>
    ({ type: 'letter', heading, to, subject, paragraphs: 3, signatory: 'Dr. Anna Dimagiba', date: dateLabel(days) }),
  slides: (group: SampleGroup, bullets: string[]): SampleDocSpec =>
    ({ type: 'slides', title: group.title, group: group.code, bullets })
};

let counter = 0;
function file(
  code: string,
  documentCategory: string,
  fileName: string,
  options: {
    status?: 'APPROVED' | 'UNDER_REVIEW' | 'NEEDS_REVISION' | null;
    days: number;
    uploader?: number;
    page?: (group: SampleGroup) => SampleDocSpec;
    comments?: ApiReviewComment[];
    version?: number;
  }
): ApiDocumentFile {
  const group = byCode[code];
  counter += 1;
  const isScan = /\.(jpg|jpeg|png)$/i.test(fileName);
  return {
    id: `sample-file-${counter}`,
    fileName,
    filePath: `sample/${code}/${fileName}`,
    fileType: isScan ? 'image/jpeg' : fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
    fileSize: isScan ? 420_000 + counter * 23_000 : 1_200_000 + counter * 41_000,
    uploadedByName: group.team[options.uploader ?? 0]?.name ?? group.team[0].name,
    projectId: projectIdOf(code),
    projectTitle: group.title,
    groupCode: code,
    groupTitle: group.title,
    groupMembers: group.team,
    milestone: group.stage,
    submissionStatus: options.status === undefined ? 'APPROVED' : options.status,
    submissionVersion: options.version ?? 1,
    submittedAt: options.status === null ? null : daysAgo(options.days),
    reviewedAt: options.status === 'APPROVED' || options.status === undefined || options.status === 'NEEDS_REVISION' ? daysAgo(Math.max(0, options.days - 2)) : null,
    reviewComments: options.comments ?? null,
    documentCategory,
    createdAt: daysAgo(options.days),
    // Scans and PDFs both get a drawn first page; the seed makes every page look different.
    sampleUrl: options.page ? renderSampleDocument(options.page(group), `${code}|${fileName}|${counter}`) : undefined,
    isSample: true
  };
}

/** Evidence files for the sample groups. Built per call so dates stay relative to today. */
export function getSampleEvidenceFiles(): ApiDocumentFile[] {
  counter = 0;
  return [
    // DEMO-EV-01 — nearly complete: every required stage approved, plus an award
    file('DEMO-EV-01', 'concept-defense-application', 'concept-defense-application-form.jpg', { days: 140, page: (g) => doc.application(g, 'Concept Presentation', 140, 'approved') }),
    file('DEMO-EV-01', 'proposal-defense-application', 'proposal-defense-application-form.jpg', { days: 100, page: (g) => doc.application(g, 'Proposal Defense', 100, 'approved') }),
    file('DEMO-EV-01', 'testing-evidence', 'user-acceptance-test-results.pdf', {
      days: 55,
      page: (g) => doc.results(g, 'User Acceptance Test Results', [['Functional suitability', 92], ['Performance efficiency', 88], ['Usability', 94], ['Reliability', 90], ['Security', 86]], 'Passed all acceptance criteria. Ready for final defense.', 55)
    }),
    file('DEMO-EV-01', 'final-defense-application', 'final-defense-application-form.jpg', { days: 20, page: (g) => doc.application(g, 'Final Defense', 20, 'approved') }),
    file('DEMO-EV-01', 'final-manuscript', 'final-manuscript-v3.pdf', {
      days: 9, version: 3, page: (g) => doc.manuscript(g, 9),
      comments: [comment('c1', 'APPROVE', 'Manuscript approved for repository submission.', 'Dr. Elena Santos', 7)]
    }),
    file('DEMO-EV-01', 'award-recognition', 'best-capstone-award-certificate.jpg', { days: 6, status: null, page: (g) => doc.certificate(g, 'Excellence', 'Best Capstone Project, College of IT Research Colloquium', 6) }),
    file('DEMO-EV-01', 'presentation-files', 'final-defense-slides.pdf', { days: 21, page: (g) => doc.slides(g, ['Problem & objectives', 'Image-matching pipeline', 'Evaluation results', 'Deployment plan']) }),

    // DEMO-EV-02 — mid-thesis: early stages approved, testing still in review
    file('DEMO-EV-02', 'concept-defense-application', 'concept-approval-form.pdf', { days: 90, page: (g) => doc.application(g, 'Concept Presentation', 90, 'approved') }),
    file('DEMO-EV-02', 'proposal-defense-application', 'proposal-defense-application-scan.jpg', { days: 48, uploader: 1, page: (g) => doc.application(g, 'Proposal Defense', 48, 'approved') }),
    file('DEMO-EV-02', 'testing-evidence', 'sms-load-test-results.pdf', {
      days: 4, status: 'UNDER_REVIEW', uploader: 2,
      page: (g) => doc.results(g, 'SMS Load Test Results', [['Delivery rate (1k msgs)', 97], ['Queue update latency', 81], ['Peak-hour stability', 78], ['Error recovery', 84]], 'Pending adviser review of peak-hour logs.', 4)
    }),
    file('DEMO-EV-02', 'testing-evidence', 'clinic-pilot-evaluation-sheet.jpg', {
      days: 3, status: 'UNDER_REVIEW',
      page: (g) => doc.results(g, 'Clinic Pilot Evaluation', [['Staff ease of use', 88], ['Patient waiting time', 76], ['SMS clarity', 91]], 'Staff requested bigger queue numbers on display.', 3)
    }),
    file('DEMO-EV-02', 'system-files', 'queue-system-build.zip', { days: 5, status: null, uploader: 3 }),

    // DEMO-EV-03 — skipped a required stage (no proposal evidence), and one file needs revision
    file('DEMO-EV-03', 'concept-defense-application', 'concept-presentation-form.jpg', { days: 120, page: (g) => doc.application(g, 'Concept Presentation', 120, 'approved') }),
    file('DEMO-EV-03', 'testing-evidence', 'quiz-accuracy-test.pdf', {
      days: 12, status: 'NEEDS_REVISION', version: 2,
      page: (g) => doc.results(g, 'Item Accuracy Test', [['Question difficulty calibration', 72], ['Answer-key accuracy', 88], ['Topic coverage', 70]], 'Add item analysis table and sample size.', 12),
      comments: [
        comment('c2', 'REQUEST_CHANGES', 'Include the item analysis table and the sample size used.', 'Engr. Mark Villanueva', 10),
        comment('c3', 'COMMENT', 'Resubmit with the updated test plan.', 'Engr. Mark Villanueva', 9)
      ]
    }),
    file('DEMO-EV-03', 'activity-evidence', 'science-fair-activity-report.jpg', { days: 30, status: null, page: (g) => doc.activity(g, 'Division Science Fair Demo', 'City Central High School', 30) }),

    // DEMO-EV-04 — the same form uploaded twice (one approved, one flagged)
    file('DEMO-EV-04', 'concept-defense-application', 'concept-defense-form.jpg', { days: 70, page: (g) => doc.application(g, 'Concept Presentation', 70, 'approved') }),
    file('DEMO-EV-04', 'concept-defense-application', 'concept-defense-form.jpg', {
      days: 68, status: 'NEEDS_REVISION', page: (g) => doc.application(g, 'Concept Presentation', 68, 'revision'),
      comments: [comment('c4', 'REQUEST_CHANGES', 'Duplicate of an approved file. Remove or replace.', 'Prof. Grace Dela Cruz', 66)]
    }),
    file('DEMO-EV-04', 'proposal-defense-application', 'proposal-endorsement-form.pdf', { days: 8, status: 'UNDER_REVIEW', uploader: 1, page: (g) => doc.application(g, 'Proposal Defense', 8, 'pending') }),
    file('DEMO-EV-04', 'supporting-documents', 'barangay-moa-draft.pdf', {
      days: 15, status: null, uploader: 2,
      page: () => doc.letter('Memorandum of Agreement', 'Hon. Rosa Delgado', 'Pilot deployment of the document request system in Barangay Poblacion', 15)
    }),

    // DEMO-EV-05 — early stage, activity-heavy (achievement logs need no review)
    file('DEMO-EV-05', 'concept-defense-application', 'concept-defense-application.jpg', { days: 25, status: 'UNDER_REVIEW', page: (g) => doc.application(g, 'Concept Presentation', 25, 'pending') }),
    file('DEMO-EV-05', 'activity-evidence', 'farm-field-visit-report.jpg', { days: 40, status: null, uploader: 1, page: (g) => doc.activity(g, 'Farm Field Visit & Interview', 'Lumbia Community Farm', 40) }),
    file('DEMO-EV-05', 'activity-evidence', 'leaf-sample-collection-report.jpg', { days: 38, status: null, uploader: 2, page: (g) => doc.activity(g, 'Leaf Sample Collection', 'Provincial Agriculture Office', 38) }),
    file('DEMO-EV-05', 'award-recognition', 'regional-hackathon-certificate.jpg', { days: 18, status: null, page: (g) => doc.certificate(g, 'Recognition', 'Finalist, Regional AgriTech Hackathon 2026', 18) })
    // DEMO-EV-06 has no files on purpose: it only shows up in Coverage / group folders as "no evidence yet".
  ];
}

/** Group rows (for coverage and the group folders), including the group with no evidence. */
export const SAMPLE_EVIDENCE_GROUPS: GroupRow[] = GROUPS.map((group) => ({
  projectId: projectIdOf(group.code),
  code: group.code,
  title: group.title,
  projectTitle: group.title,
  progress: group.progress,
  progressStage: group.stage
}));
