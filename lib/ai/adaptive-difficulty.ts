/**
 * Adaptive difficulty algorithm
 * correctness_rate > 80% -> increase
 * correctness_rate < 40% -> decrease
 * 40-80% -> maintain
 */
export type DifficultyLevel = "easy" | "medium" | "hard" | "very_hard"

const ORDER: DifficultyLevel[] = ["easy", "medium", "hard", "very_hard"]

export function getNextDifficulty(
  current: DifficultyLevel,
  correctnessRate: number
): DifficultyLevel {
  const idx = ORDER.indexOf(current)
  if (correctnessRate > 80 && idx < ORDER.length - 1) return ORDER[idx + 1]
  if (correctnessRate < 40 && idx > 0) return ORDER[idx - 1]
  return current
}

export function computeCorrectnessRate(attempts: { isCorrect: boolean }[]): number {
  if (attempts.length === 0) return 50
  const correct = attempts.filter((a) => a.isCorrect).length
  return Math.round((correct / attempts.length) * 100)
}
