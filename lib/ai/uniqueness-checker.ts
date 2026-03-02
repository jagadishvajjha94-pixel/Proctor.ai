/**
 * Hash-based question uniqueness - prevent duplicates across 1000 students
 */
import crypto from "crypto"
import { prisma } from "../db"
import { QUESTIONS_PER_PHASE, QUESTION_REUSE_AFTER } from "../constants"

export function generateQuestionHash(
  category: string,
  difficulty: string,
  title: string,
  description: string,
  constraints: string[]
): string {
  const normalized = `${category}:${difficulty}:${title.trim().toLowerCase()}:${description.trim().slice(0, 500)}:${constraints.sort().join("|")}`
  return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 24)
}

export async function isHashUsed(hash: string): Promise<boolean> {
  const q = await prisma.questionHash.findUnique({ where: { hash } })
  const count = q?.useCount ?? 0
  return count > 0 && count < QUESTION_REUSE_AFTER
}

export async function isHashSeenByStudent(studentId: string, hash: string): Promise<boolean> {
  const r = await prisma.studentQuestionHash.findUnique({
    where: { studentId_questionHash: { studentId, questionHash: hash } },
  })
  return !!r
}

export async function markHashUsed(hash: string): Promise<void> {
  await prisma.questionHash.upsert({
    where: { hash },
    create: { hash, useCount: 1 },
    update: { useCount: { increment: 1 } },
  })
}

export async function markHashSeenByStudent(studentId: string, hash: string): Promise<void> {
  await prisma.studentQuestionHash.upsert({
    where: { studentId_questionHash: { studentId, questionHash: hash } },
    create: { studentId, questionHash: hash },
    update: {},
  })
}

export async function getSeenHashesForStudent(studentId: string): Promise<Set<string>> {
  const list = await prisma.studentQuestionHash.findMany({
    where: { studentId },
    select: { questionHash: true },
  })
  return new Set(list.map((r) => r.questionHash))
}
