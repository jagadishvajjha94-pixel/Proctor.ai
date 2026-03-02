/**
 * MCQ scoring: compute score from student answers vs correct indices.
 * Used at submit time so total_score = mcqScore + codingScore (single write to backend).
 * Questions must have correctIndex and optional maxScore (default 10).
 */
export function computeMcqScore(questions, mcqAnswers) {
  if (!questions || !Array.isArray(questions) || !mcqAnswers || typeof mcqAnswers !== 'object') {
    return 0;
  }
  let total = 0;
  for (const q of questions) {
    const selected = mcqAnswers[q.id];
    const correctIndex = q.correctIndex;
    const maxScore = typeof q.maxScore === 'number' ? q.maxScore : 10;
    if (Number(selected) === Number(correctIndex)) {
      total += maxScore;
    }
  }
  return total;
}
