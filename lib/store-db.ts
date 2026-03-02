import { prisma } from "./db"
import type {
  Student,
  TestSession,
  TestResult,
  EligibilityDecision,
  ViolationLog,
  Question,
  Submission,
} from "./types"

function toStudent(s: { id: string; name: string; email: string; college: string; registrationId: string; currentAttempt: number; currentPhase: string; language: string; status: string; violations: number; integrityScore: number; createdAt: Date }): Student {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    college: s.college,
    registrationId: s.registrationId,
    currentAttempt: s.currentAttempt as 1 | 2,
    currentPhase: s.currentPhase as "phase1" | "phase2",
    language: s.language as Student["language"],
    status: s.status as Student["status"],
    violations: s.violations,
    integrityScore: s.integrityScore,
    createdAt: s.createdAt.toISOString(),
  }
}

function toSession(
  s: Awaited<ReturnType<typeof prisma.testSession.findFirst>> & { violations: { id: string; type: string; timestamp: Date; severity: string; description: string; screenshotUrl: string | null }[]; submissions: { id: string; questionId: string; code: string; language: string; status: string; passedTests: number; totalTests: number; executionTime: number | null; memoryUsed: number | null; score: number; submittedAt: Date }[] }
): TestSession | null {
  if (!s) return null
  const questions = (s.questions as Question[] | null) ?? []
  return {
    id: s.id,
    studentId: s.studentId,
    attempt: s.attempt as 1 | 2,
    phase: s.phase as "phase1" | "phase2",
    status: s.status as TestSession["status"],
    startTime: s.startTime.toISOString(),
    endTime: s.endTime?.toISOString(),
    violations: s.violations.map((v) => ({
      id: v.id,
      type: v.type as ViolationLog["type"],
      timestamp: v.timestamp.toISOString(),
      severity: v.severity as "low" | "medium" | "high",
      description: v.description,
      screenshotUrl: v.screenshotUrl ?? undefined,
    })),
    questions,
    submissions: s.submissions.map((sub) => ({
      id: sub.id,
      questionId: sub.questionId,
      code: sub.code,
      language: sub.language as Submission["language"],
      status: sub.status as Submission["status"],
      passedTests: sub.passedTests,
      totalTests: sub.totalTests,
      executionTime: sub.executionTime ?? undefined,
      memoryUsed: sub.memoryUsed ?? undefined,
      score: sub.score,
      submittedAt: sub.submittedAt.toISOString(),
    })),
  }
}

export const dbStore = {
  async getStudent(id: string): Promise<Student | undefined> {
    const s = await prisma.student.findUnique({ where: { id } })
    return s ? toStudent(s) : undefined
  },

  async getStudentByEmail(email: string): Promise<Student | undefined> {
    const s = await prisma.student.findUnique({ where: { email } })
    return s ? toStudent(s) : undefined
  },

  async setStudent(student: Student): Promise<void> {
    await prisma.student.upsert({
      where: { id: student.id },
      create: {
        id: student.id,
        name: student.name,
        email: student.email,
        college: student.college,
        registrationId: student.registrationId,
        currentAttempt: student.currentAttempt,
        currentPhase: student.currentPhase,
        language: student.language,
        status: student.status,
        violations: student.violations,
        integrityScore: student.integrityScore,
      },
      update: {
        name: student.name,
        college: student.college,
        currentAttempt: student.currentAttempt,
        currentPhase: student.currentPhase,
        language: student.language,
        status: student.status,
        violations: student.violations,
        integrityScore: student.integrityScore,
      },
    })
  },

  async getAllStudents(limit = 10000, offset = 0): Promise<Student[]> {
    const list = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })
    return list.map(toStudent)
  },

  async getSession(id: string): Promise<TestSession | undefined> {
    const s = await prisma.testSession.findUnique({
      where: { id },
      include: { violations: true, submissions: true },
    })
    return s ? toSession(s)! : undefined
  },

  async getSessionsByStudent(studentId: string): Promise<TestSession[]> {
    const list = await prisma.testSession.findMany({
      where: { studentId },
      include: { violations: true, submissions: true },
      orderBy: { startTime: "desc" },
    })
    return list.map((s) => toSession(s)!).filter(Boolean)
  },

  async setSession(session: TestSession): Promise<void> {
    const existing = await prisma.testSession.findUnique({ where: { id: session.id } })
    if (existing) {
      await prisma.testSession.update({
        where: { id: session.id },
        data: {
          status: session.status,
          endTime: session.endTime ? new Date(session.endTime) : null,
          questions: (session.questions ?? []) as object,
        },
      })
    } else {
      await prisma.testSession.create({
        data: {
          id: session.id,
          studentId: session.studentId,
          attempt: session.attempt,
          phase: session.phase,
          status: session.status,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : null,
          questions: (session.questions ?? []) as object,
        },
      })
      for (const v of session.violations) {
        await prisma.violationLog.create({
          data: {
            id: v.id,
            sessionId: session.id,
            type: v.type,
            timestamp: new Date(v.timestamp),
            severity: v.severity,
            description: v.description,
            screenshotUrl: v.screenshotUrl,
          },
        }).catch(() => {})
      }
      for (const sub of session.submissions) {
        await prisma.submission.create({
          data: {
            id: sub.id,
            sessionId: session.id,
            questionId: sub.questionId,
            code: sub.code,
            language: sub.language,
            status: sub.status,
            passedTests: sub.passedTests,
            totalTests: sub.totalTests,
            executionTime: sub.executionTime,
            memoryUsed: sub.memoryUsed,
            score: sub.score,
            submittedAt: new Date(sub.submittedAt),
          },
        }).catch(() => {})
      }
    }
  },

  async getResults(studentId: string): Promise<TestResult[]> {
    const list = await prisma.testResult.findMany({
      where: { studentId },
      orderBy: { attempt: "asc" },
    })
    return list.map((r) => ({
      studentId: r.studentId,
      attempt: r.attempt as 1 | 2,
      phase1Score: r.phase1Score,
      phase2Score: r.phase2Score,
      totalScore: r.totalScore,
      accuracy: r.accuracy,
      performance: r.performance,
      violationCount: r.violationCount,
      integrityScore: r.integrityScore,
      codingAccuracy: r.codingAccuracy,
      problemSolvingDepth: r.problemSolvingDepth,
      consistency: r.consistency,
    }))
  },

  async addResult(result: TestResult): Promise<void> {
    await prisma.testResult.upsert({
      where: { studentId_attempt: { studentId: result.studentId, attempt: result.attempt } },
      create: {
        studentId: result.studentId,
        attempt: result.attempt,
        phase1Score: result.phase1Score,
        phase2Score: result.phase2Score,
        totalScore: result.totalScore,
        accuracy: result.accuracy,
        performance: result.performance,
        violationCount: result.violationCount,
        integrityScore: result.integrityScore,
        codingAccuracy: result.codingAccuracy,
        problemSolvingDepth: result.problemSolvingDepth,
        consistency: result.consistency,
      },
      update: {
        phase1Score: result.phase1Score,
        phase2Score: result.phase2Score,
        totalScore: result.totalScore,
        accuracy: result.accuracy,
        performance: result.performance,
        violationCount: result.violationCount,
        integrityScore: result.integrityScore,
        codingAccuracy: result.codingAccuracy,
        problemSolvingDepth: result.problemSolvingDepth,
        consistency: result.consistency,
      },
    })
  },

  async getDecision(studentId: string): Promise<EligibilityDecision | undefined> {
    const d = await prisma.eligibilityDecision.findUnique({
      where: { studentId },
    })
    if (!d) return undefined
    return {
      studentId: d.studentId,
      status: d.status as EligibilityDecision["status"],
      confidence: d.confidence,
      reasons: d.reasons,
      scores: d.scores as EligibilityDecision["scores"],
      recommendation: d.recommendation,
    }
  },

  async setDecision(decision: EligibilityDecision): Promise<void> {
    await prisma.eligibilityDecision.upsert({
      where: { studentId: decision.studentId },
      create: {
        studentId: decision.studentId,
        status: decision.status,
        confidence: decision.confidence,
        reasons: decision.reasons,
        scores: decision.scores as object,
        recommendation: decision.recommendation,
      },
      update: {
        status: decision.status,
        confidence: decision.confidence,
        reasons: decision.reasons,
        scores: decision.scores as object,
        recommendation: decision.recommendation,
      },
    })
  },

  async getAllDecisions(): Promise<EligibilityDecision[]> {
    const list = await prisma.eligibilityDecision.findMany()
    return list.map((d) => ({
      studentId: d.studentId,
      status: d.status as EligibilityDecision["status"],
      confidence: d.confidence,
      reasons: d.reasons,
      scores: d.scores as EligibilityDecision["scores"],
      recommendation: d.recommendation,
    }))
  },

  async getQuestionUseCount(hash: string): Promise<number> {
    const q = await prisma.questionHash.findUnique({ where: { hash } })
    return q?.useCount ?? 0
  },

  async incrementQuestionUse(hash: string): Promise<number> {
    const q = await prisma.questionHash.upsert({
      where: { hash },
      create: { hash, useCount: 1 },
      update: { useCount: { increment: 1 } },
    })
    return q.useCount
  },

  async getStudentSeenQuestionHashes(studentId: string): Promise<string[]> {
    const list = await prisma.studentQuestionHash.findMany({
      where: { studentId },
      select: { questionHash: true },
    })
    return list.map((r) => r.questionHash)
  },

  async markStudentSeenQuestion(studentId: string, questionHash: string): Promise<void> {
    await prisma.studentQuestionHash.upsert({
      where: {
        studentId_questionHash: { studentId, questionHash },
      },
      create: { studentId, questionHash },
      update: {},
    })
  },

  async isQuestionUsed(hash: string): Promise<boolean> {
    const { QUESTION_REUSE_AFTER } = await import("./constants")
    const count = await this.getQuestionUseCount(hash)
    return count > 0 && count < QUESTION_REUSE_AFTER
  },

  async markQuestionUsed(hash: string): Promise<void> {
    await this.incrementQuestionUse(hash)
  },

  async getBlueprintUsage(blueprintId: string): Promise<number> {
    const b = await prisma.blueprintUsage.findUnique({ where: { blueprintId } })
    return b?.count ?? 0
  },

  async incrementBlueprintUsage(blueprintId: string): Promise<void> {
    await prisma.blueprintUsage.upsert({
      where: { blueprintId },
      create: { blueprintId, count: 1 },
      update: { count: { increment: 1 } },
    })
  },

  async addViolation(sessionId: string, violation: ViolationLog): Promise<number> {
    await prisma.violationLog.create({
      data: {
        id: violation.id,
        sessionId,
        type: violation.type,
        timestamp: new Date(violation.timestamp),
        severity: violation.severity,
        description: violation.description,
        screenshotUrl: violation.screenshotUrl,
      },
    })
    const session = await prisma.testSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { violations: true } } },
    })
    if (session) {
      await prisma.student.update({
        where: { id: session.studentId },
        data: { violations: { increment: 1 } },
      })
    }
    const count = await prisma.violationLog.count({ where: { sessionId } })
    return count
  },

  async addSubmission(sessionId: string, submission: Submission): Promise<void> {
    await prisma.submission.upsert({
      where: {
        sessionId_questionId: { sessionId, questionId: submission.questionId },
      },
      create: {
        id: submission.id,
        sessionId,
        questionId: submission.questionId,
        code: submission.code,
        language: submission.language,
        status: submission.status,
        passedTests: submission.passedTests,
        totalTests: submission.totalTests,
        executionTime: submission.executionTime,
        memoryUsed: submission.memoryUsed,
        score: submission.score,
        submittedAt: new Date(submission.submittedAt),
      },
      update: {
        code: submission.code,
        language: submission.language,
        status: submission.status,
        passedTests: submission.passedTests,
        totalTests: submission.totalTests,
        executionTime: submission.executionTime,
        memoryUsed: submission.memoryUsed,
        score: submission.score,
        submittedAt: new Date(submission.submittedAt),
      },
    })
  },

  async getStats(): Promise<{
    totalStudents: number
    activeTests: number
    completed: number
    eligible: number
    borderline: number
    notEligible: number
    totalViolations: number
  }> {
    const [totalStudents, activeTests, completed, decisions, violationsSum] = await Promise.all([
      prisma.student.count(),
      prisma.testSession.count({ where: { status: "in_progress" } }),
      prisma.student.count({ where: { status: "completed" } }),
      prisma.eligibilityDecision.groupBy({ by: ["status"], _count: true }),
      prisma.student.aggregate({ _sum: { violations: true } }),
    ])
    const decisionMap = Object.fromEntries(decisions.map((d) => [d.status, d._count]))
    return {
      totalStudents,
      activeTests,
      completed,
      eligible: decisionMap["eligible"] ?? 0,
      borderline: decisionMap["borderline"] ?? 0,
      notEligible: decisionMap["not_eligible"] ?? 0,
      totalViolations: violationsSum._sum.violations ?? 0,
    }
  },
}
