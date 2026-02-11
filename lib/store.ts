// Production store: uses PostgreSQL when DATABASE_URL is set, else in-memory (dev/demo)
import type {
  Student,
  TestSession,
  TestResult,
  EligibilityDecision,
  ViolationLog,
  Submission,
} from "./types"

export const useDb = !!process.env.DATABASE_URL

async function getStore() {
  if (useDb) {
    const { dbStore } = await import("./store-db")
    return dbStore
  }
  const { memoryStore } = await import("./store-memory")
  return memoryStore
}

export const store = {
  async getStudent(id: string) {
    return (await getStore()).getStudent(id)
  },
  async getStudentByEmail(email: string) {
    return (await getStore()).getStudentByEmail(email)
  },
  async setStudent(student: Student) {
    return (await getStore()).setStudent(student)
  },
  async getAllStudents(limit?: number, offset?: number) {
    return (await getStore()).getAllStudents(limit, offset)
  },
  async getSession(id: string) {
    return (await getStore()).getSession(id)
  },
  async getSessionsByStudent(studentId: string) {
    return (await getStore()).getSessionsByStudent(studentId)
  },
  async setSession(session: TestSession) {
    return (await getStore()).setSession(session)
  },
  async getResults(studentId: string) {
    return (await getStore()).getResults(studentId)
  },
  async addResult(result: TestResult) {
    return (await getStore()).addResult(result)
  },
  async getDecision(studentId: string) {
    return (await getStore()).getDecision(studentId)
  },
  async setDecision(decision: EligibilityDecision) {
    return (await getStore()).setDecision(decision)
  },
  async getAllDecisions() {
    return (await getStore()).getAllDecisions()
  },
  async isQuestionUsed(hash: string) {
    return (await getStore()).isQuestionUsed(hash)
  },
  async markQuestionUsed(hash: string) {
    return (await getStore()).markQuestionUsed(hash)
  },
  async getBlueprintUsage(blueprintId: string) {
    return (await getStore()).getBlueprintUsage(blueprintId)
  },
  async incrementBlueprintUsage(blueprintId: string) {
    return (await getStore()).incrementBlueprintUsage(blueprintId)
  },
  async addViolation(sessionId: string, violation: ViolationLog) {
    return (await getStore()).addViolation(sessionId, violation)
  },
  async addSubmission(sessionId: string, submission: Submission) {
    return (await getStore()).addSubmission(sessionId, submission)
  },
  async getStats() {
    return (await getStore()).getStats()
  },
}
