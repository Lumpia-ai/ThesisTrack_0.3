// Lightweight, dependency-free duplicate-title detection. Compares titles by
// significant-word overlap (Jaccard similarity over normalized word sets) —
// no external NLP service, cheap enough to run over a few hundred candidates
// per request. Good enough to flag "this is basically the same title as
// Group 2025-03's" without needing a real similarity API.

const GENERIC_STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'and', 'or', 'in', 'on', 'to', 'with',
  'using', 'based', 'via', 'into', 'from', 'by', 'at', 'as', 'is', 'are'
]);

export function normalizeTitleWords(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !GENERIC_STOPWORDS.has(word));

  return new Set(words);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) {
      intersection++;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type SimilarTitleMatch = {
  id: string;
  title: string;
  groupCode: string | null;
  score: number; // 0-100
};

// Titles sharing roughly a third or more of their distinct significant words
// are worth surfacing — lower and almost any two titles in the same field
// start matching on generic domain words ("system," "management," "based").
export const SIMILARITY_MATCH_THRESHOLD = 0.34;
export const MAX_SIMILAR_TITLES = 5;

export function findSimilarTitles(
  targetTitle: string,
  targetId: string,
  candidates: Array<{ id: string; title: string; groupCode: string | null }>
): SimilarTitleMatch[] {
  const targetWords = normalizeTitleWords(targetTitle);

  if (targetWords.size === 0) {
    return [];
  }

  const matches: SimilarTitleMatch[] = [];

  for (const candidate of candidates) {
    if (candidate.id === targetId) {
      continue;
    }

    const score = jaccardSimilarity(targetWords, normalizeTitleWords(candidate.title));

    if (score >= SIMILARITY_MATCH_THRESHOLD) {
      matches.push({ id: candidate.id, title: candidate.title, groupCode: candidate.groupCode, score: Math.round(score * 100) });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, MAX_SIMILAR_TITLES);
}
