export type Language = "c" | "cpp" | "java" | "python" | "javascript"

export type TestPhase = "phase1" | "phase2"
export type TestAttempt = 1 | 2
export type TestStatus = "not_started" | "in_progress" | "completed" | "locked"

export interface Student {
  id: string
  name: string
  email: string
  college: string
  registrationId: string
  currentAttempt: TestAttempt
  currentPhase: TestPhase
  language: Language
  status: TestStatus
  violations: number
  integrityScore: number
  createdAt: string
}

export interface TestSession {
  id: string
  studentId: string
  attempt: TestAttempt
  phase: TestPhase
  status: TestStatus
  startTime: string
  endTime?: string
  violations: ViolationLog[]
  questions: Question[]
  submissions: Submission[]
}

export interface Question {
  id: string
  blueprintId: string
  hash: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  category: "fundamentals" | "logic" | "optimization" | "real_world"
  constraints: string[]
  examples: { input: string; output: string; explanation?: string }[]
  testCases: { input: string; expectedOutput: string; hidden: boolean }[]
  language: Language
  timeLimit: number // seconds
  memoryLimit: number // MB
}

export interface Submission {
  id: string
  questionId: string
  code: string
  language: Language
  status: "pending" | "running" | "accepted" | "wrong_answer" | "time_limit" | "runtime_error" | "compile_error"
  passedTests: number
  totalTests: number
  executionTime?: number
  memoryUsed?: number
  score: number
  submittedAt: string
}

export type ViolationType =
  | "multiple_faces"
  | "looking_away"
  | "phone_detected"
  | "talking"
  | "tab_switch"
  | "camera_off"
  | "suspicious_inactivity"
  | "copy_paste"

export interface ViolationLog {
  id: string
  type: ViolationType
  timestamp: string
  severity: "low" | "medium" | "high"
  description: string
  screenshotUrl?: string
}

export interface TestResult {
  studentId: string
  attempt: TestAttempt
  phase1Score: number
  phase2Score: number
  totalScore: number
  accuracy: number
  performance: number
  violationCount: number
  integrityScore: number
  codingAccuracy: number
  problemSolvingDepth: number
  consistency: number
}

export type EligibilityStatus = "eligible" | "borderline" | "not_eligible"

export interface EligibilityDecision {
  studentId: string
  status: EligibilityStatus
  confidence: number
  reasons: string[]
  scores: {
    codingAccuracy: number
    problemSolving: number
    performance: number
    consistency: number
    integrity: number
    behavioralTrust: number
  }
  recommendation: string
}

export interface ProctoringState {
  cameraActive: boolean
  micActive: boolean
  violations: ViolationLog[]
  warningLevel: 0 | 1 | 2 | 3
  isLocked: boolean
  lastActivityTime: string
}
