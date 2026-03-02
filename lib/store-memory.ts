// In-memory store for dev/demo when DATABASE_URL is not set
import type {
  Student,
  TestSession,
  TestResult,
  EligibilityDecision,
  ViolationLog,
  Question,
  Submission,
} from "./types"

class MemoryStore {
  private students: Map<string, Student> = new Map()
  private sessions: Map<string, TestSession> = new Map()
  private results: Map<string, TestResult[]> = new Map()
  private decisions: Map<string, EligibilityDecision> = new Map()
  private questionUseCount: Map<string, number> = new Map()
  private studentSeenHashes: Map<string, Set<string>> = new Map()
  private blueprintUsage: Map<string, number> = new Map()

  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id)
  }

  async getStudentByEmail(email: string): Promise<Student | undefined> {
    for (const student of this.students.values()) {
      if (student.email === email) return student
    }
    return undefined
  }

  async setStudent(student: Student): Promise<void> {
    this.students.set(student.id, student)
  }

  async getAllStudents(limit = 10000, offset = 0): Promise<Student[]> {
    const all = Array.from(this.students.values())
    return all.slice(offset, offset + limit)
  }

  async getSession(id: string): Promise<TestSession | undefined> {
    return this.sessions.get(id)
  }

  async getSessionsByStudent(studentId: string): Promise<TestSession[]> {
    return Array.from(this.sessions.values()).filter((s) => s.studentId === studentId)
  }

  async setSession(session: TestSession): Promise<void> {
    this.sessions.set(session.id, session)
  }

  async getResults(studentId: string): Promise<TestResult[]> {
    return this.results.get(studentId) || []
  }

  async addResult(result: TestResult): Promise<void> {
    const existing = this.results.get(result.studentId) || []
    existing.push(result)
    this.results.set(result.studentId, existing)
  }

  async getDecision(studentId: string): Promise<EligibilityDecision | undefined> {
    return this.decisions.get(studentId)
  }

  async setDecision(decision: EligibilityDecision): Promise<void> {
    this.decisions.set(decision.studentId, decision)
  }

  async getAllDecisions(): Promise<EligibilityDecision[]> {
    return Array.from(this.decisions.values())
  }

  async getQuestionUseCount(hash: string): Promise<number> {
    return this.questionUseCount.get(hash) ?? 0
  }

  async incrementQuestionUse(hash: string): Promise<number> {
    const count = (this.questionUseCount.get(hash) ?? 0) + 1
    this.questionUseCount.set(hash, count)
    return count
  }

  async getStudentSeenQuestionHashes(studentId: string): Promise<string[]> {
    return Array.from(this.studentSeenHashes.get(studentId) ?? [])
  }

  async markStudentSeenQuestion(studentId: string, hash: string): Promise<void> {
    let set = this.studentSeenHashes.get(studentId)
    if (!set) {
      set = new Set()
      this.studentSeenHashes.set(studentId, set)
    }
    set.add(hash)
  }

  async isQuestionUsed(hash: string): Promise<boolean> {
    const { QUESTION_REUSE_AFTER } = await import("./constants")
    const count = this.questionUseCount.get(hash) ?? 0
    return count > 0 && count < QUESTION_REUSE_AFTER
  }

  async markQuestionUsed(hash: string): Promise<void> {
    await this.incrementQuestionUse(hash)
  }

  async getBlueprintUsage(blueprintId: string): Promise<number> {
    return this.blueprintUsage.get(blueprintId) || 0
  }

  async incrementBlueprintUsage(blueprintId: string): Promise<void> {
    const count = await this.getBlueprintUsage(blueprintId)
    this.blueprintUsage.set(blueprintId, count + 1)
  }

  async addViolation(sessionId: string, violation: ViolationLog): Promise<number> {
    const session = this.sessions.get(sessionId)
    if (!session) return 0
    session.violations.push(violation)
    this.sessions.set(sessionId, session)

    const student = this.students.get(session.studentId)
    if (student) {
      student.violations = (student.violations || 0) + 1
      this.students.set(student.id, student)
    }
    return session.violations.length
  }

  async addSubmission(sessionId: string, submission: Submission): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return
    const idx = session.submissions.findIndex((s) => s.questionId === submission.questionId)
    if (idx >= 0) session.submissions[idx] = submission
    else session.submissions.push(submission)
    this.sessions.set(sessionId, session)
  }

  async getStats() {
    const students = Array.from(this.students.values())
    const decisions = Array.from(this.decisions.values())
    return {
      totalStudents: students.length,
      activeTests: Array.from(this.sessions.values()).filter((s) => s.status === "in_progress").length,
      completed: students.filter((s) => s.status === "completed").length,
      eligible: decisions.filter((d) => d.status === "eligible").length,
      borderline: decisions.filter((d) => d.status === "borderline").length,
      notEligible: decisions.filter((d) => d.status === "not_eligible").length,
      totalViolations: students.reduce((sum, s) => sum + (s.violations || 0), 0),
    }
  }
}

const memoryStore = new MemoryStore()

// Seed demo data only in development when using memory store
async function seedDemoData() {
  if (process.env.NODE_ENV === "production") return
  const students = await memoryStore.getAllStudents(1)
  if (students.length > 0) return

  const colleges = [
    "IIT Delhi", "IIT Bombay", "NIT Trichy", "BITS Pilani", "IIT Madras",
    "NIT Warangal", "IIIT Hyderabad", "VIT Vellore", "DTU Delhi", "IIT Kanpur",
    "NSUT Delhi", "IIIT Delhi", "NIT Surathkal", "IIT Roorkee", "BITS Goa",
    "Jadavpur University", "IIT Kharagpur", "NIT Calicut", "PEC Chandigarh", "MNNIT Allahabad",
  ]
  const firstNames = ["Arjun", "Priya", "Rahul", "Ananya", "Vikram", "Sneha", "Aditya", "Kavya", "Rohan", "Meera"]
  const lastNames = ["Sharma", "Patel", "Gupta", "Singh", "Kumar", "Reddy", "Nair", "Joshi", "Verma", "Iyer"]
  const languages: Array<"python" | "javascript" | "java" | "cpp" | "c"> = ["python", "javascript", "java", "cpp", "c"]
  const statuses: Array<"not_started" | "in_progress" | "completed" | "locked"> = ["completed", "in_progress", "not_started", "locked"]

  const demoStudents: Student[] = []
  for (let i = 0; i < 30; i++) {
    const firstName = firstNames[i % firstNames.length]
    const lastName = lastNames[i % lastNames.length]
    const status = statuses[i % statuses.length]
    const violations = status === "locked" ? 9 : Math.floor(Math.random() * 5)
    const integrityScore = status === "locked" ? 35 : Math.max(50, 100 - violations * 10)
    const student: Student = {
      id: `stu_demo_${i.toString().padStart(3, "0")}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`,
      college: colleges[i % colleges.length],
      registrationId: `REG2026${(i + 1).toString().padStart(3, "0")}`,
      currentAttempt: 1,
      currentPhase: "phase1",
      language: languages[i % languages.length],
      status,
      violations,
      integrityScore,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    }
    await memoryStore.setStudent(student)
    demoStudents.push(student)

    if (status !== "not_started") {
      const session: TestSession = {
        id: `ses_demo_${i}`,
        studentId: student.id,
        attempt: 1,
        phase: "phase1",
        status: status === "in_progress" ? "in_progress" : "completed",
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: status === "completed" ? new Date().toISOString() : undefined,
        violations: [],
        questions: [],
        submissions: [],
      }
      await memoryStore.setSession(session)
    }
    if (status === "completed") {
      await memoryStore.addResult({
        studentId: student.id,
        attempt: 1,
        phase1Score: 75,
        phase2Score: 70,
        totalScore: 72,
        accuracy: 80,
        performance: 75,
        violationCount: violations,
        integrityScore,
        codingAccuracy: 78,
        problemSolvingDepth: 70,
        consistency: 72,
      })
    }
  }
  for (let i = 0; i < Math.min(10, demoStudents.filter((s) => s.status === "completed").length); i++) {
    const s = demoStudents.filter((x) => x.status === "completed")[i]
    if (s) {
      await memoryStore.setDecision({
        studentId: s.id,
        status: i % 3 === 0 ? "eligible" : i % 3 === 1 ? "borderline" : "not_eligible",
        confidence: 85,
        reasons: ["Strong performance", "Good integrity"],
        scores: { codingAccuracy: 80, problemSolving: 75, performance: 70, consistency: 72, integrity: 90, behavioralTrust: 85 },
        recommendation: "Recommended for placement",
      })
    }
  }
}

seedDemoData()

export { memoryStore }
