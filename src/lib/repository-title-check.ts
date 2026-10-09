// Prototype research-title similarity check against the system Repository.
//
// Source: the mock Repository studies only (LIBRARY_PROJECTS) — no web search,
// no external databases or APIs. This is a simple, consistent title-word
// comparison for the prototype, NOT an academic plagiarism-detection algorithm.
//
// Method: both titles are lower-cased, punctuation is removed, filler words and
// very generic research words are dropped, simple plurals are folded, and the
// score is the share of distinct remaining words the two titles have in common
// (Jaccard similarity), as a percentage with one decimal.
//
// Used by the student title form (live) and by POST /api/title-submissions
// (final check), so both always produce the same number.

import { getDepartmentLabel, LIBRARY_PROJECTS, type LibraryProject } from '@/components/library/library-data';

export const REPOSITORY_SIMILARITY_LIMIT = 20; // percent; above this a title cannot proceed
export const MAX_REPOSITORY_MATCHES = 5;

const IGNORED_WORDS = new Set([
  // filler
  'a', 'an', 'the', 'of', 'for', 'and', 'or', 'in', 'on', 'to', 'with', 'using', 'based', 'via',
  'into', 'from', 'by', 'at', 'as', 'is', 'are', 'its', 'their',
  // generic research-title words that appear in almost every title
  'development', 'design', 'implementation', 'proposed', 'study', 'system', 'application', 'towards', 'toward'
]);

export function getSignificantTitleWords(title: string) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((word) => (word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))
      .filter((word) => word.length > 1 && !IGNORED_WORDS.has(word))
  );
}

export function getTitleSimilarity(left: string, right: string) {
  const a = getSignificantTitleWords(left);
  const b = getSignificantTitleWords(right);
  if (!a.size || !b.size) return 0;

  let shared = 0;
  for (const word of a) {
    if (b.has(word)) shared++;
  }

  const union = a.size + b.size - shared;
  return union ? Math.round((shared / union) * 1000) / 10 : 0;
}

export type RepositoryTitleMatch = {
  projectId: number;
  title: string;
  authors: string;
  department: string;
  type: string;
  schoolYear: string;
  similarity: number;
};

export type RepositoryTitleCheck = {
  matches: RepositoryTitleMatch[];
  highest: number;
  // Strictly above the limit blocks (20% is allowed, 20.1% is not).
  allowed: boolean;
  hasEnoughWords: boolean;
};

export function checkTitleAgainstRepository(title: string): RepositoryTitleCheck {
  const hasEnoughWords = getSignificantTitleWords(title).size > 0;

  const scored = LIBRARY_PROJECTS.map((project: LibraryProject) => {
    const repositoryTitle = project.detailTitle || project.title;

    return {
      projectId: project.id,
      title: repositoryTitle,
      authors: project.authorsShort || project.authors.join(', '),
      department: getDepartmentLabel(project.department),
      type: project.type,
      schoolYear: `S.Y. ${project.year}–${project.year + 1}`,
      // Compare against both the short and the full title; the closer one counts.
      similarity: Math.max(getTitleSimilarity(title, project.title), getTitleSimilarity(title, repositoryTitle))
    };
  });

  const matches = scored
    .filter((match) => match.similarity > 0)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, MAX_REPOSITORY_MATCHES);
  const highest = matches[0]?.similarity ?? 0;

  return { matches, highest, allowed: highest <= REPOSITORY_SIMILARITY_LIMIT, hasEnoughWords };
}

export function getTooSimilarMessage(label: string, highest: number) {
  return `${label} has a similarity of ${highest}% with an existing study in the repository. A title with more than ${REPOSITORY_SIMILARITY_LIMIT}% similarity cannot be submitted. Please revise it.`;
}
