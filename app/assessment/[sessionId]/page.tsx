"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Shield, Clock, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react"
import { CodeEditor } from "@/components/code-editor"
import { QuestionPanel } from "@/components/question-panel"
import { ProctoringCamera } from "@/components/proctoring-camera"
import { AIInterview } from "@/components/ai-interview"
import type { Question, Submission, Language, ViolationType } from "@/lib/types"

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: "q_fallback_1",
    blueprintId: "bp_array_manip",
    hash: "fb_001",
    title: "Two Sum with Target",
    description: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.\n\nReturn the answer in any order.",
    difficulty: "easy",
    category: "fundamentals",
    constraints: ["2 <= nums.length <= 10000", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Exactly one valid answer exists"],
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    ],
    testCases: [
      { input: "[2,7,11,15], 9", expectedOutput: "[0,1]", hidden: false },
      { input: "[3,2,4], 6", expectedOutput: "[1,2]", hidden: false },
      { input: "[1,5,3,7,2], 9", expectedOutput: "[1,3]", hidden: true },
      { input: "[-1,0,1,2], 1", expectedOutput: "[0,2]", hidden: true },
      { input: "[100,200,300], 400", expectedOutput: "[0,2]", hidden: true },
    ],
    language: "python",
    timeLimit: 2,
    memoryLimit: 256,
  },
  {
    id: "q_fallback_2",
    blueprintId: "bp_string_ops",
    hash: "fb_002",
    title: "Longest Palindromic Substring",
    description: "Given a string s, return the longest palindromic substring in s.\n\nA palindrome is a string that reads the same forward and backward.\n\nIf there are multiple answers with the same length, return the one that appears first.",
    difficulty: "medium",
    category: "logic",
    constraints: ["1 <= s.length <= 1000", "s consists of lowercase English letters only"],
    examples: [
      { input: 's = "babad"', output: '"bab"', explanation: '"aba" is also a valid answer' },
      { input: 's = "cbbd"', output: '"bb"' },
    ],
    testCases: [
      { input: '"babad"', expectedOutput: '"bab"', hidden: false },
      { input: '"cbbd"', expectedOutput: '"bb"', hidden: false },
      { input: '"racecar"', expectedOutput: '"racecar"', hidden: true },
      { input: '"a"', expectedOutput: '"a"', hidden: true },
      { input: '"aacabdkacaa"', expectedOutput: '"aca"', hidden: true },
    ],
    language: "python",
    timeLimit: 3,
    memoryLimit: 256,
  },
  {
    id: "q_fallback_3",
    blueprintId: "bp_sorting",
    hash: "fb_003",
    title: "Merge Intervals",
    description: "Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.\n\nReturn the result sorted by start time.",
    difficulty: "medium",
    category: "fundamentals",
    constraints: ["1 <= intervals.length <= 10000", "intervals[i].length == 2", "0 <= start_i <= end_i <= 10000"],
    examples: [
      { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]", explanation: "[1,3] and [2,6] overlap, merge into [1,6]" },
      { input: "intervals = [[1,4],[4,5]]", output: "[[1,5]]", explanation: "Intervals [1,4] and [4,5] are touching so they merge" },
    ],
    testCases: [
      { input: "[[1,3],[2,6],[8,10],[15,18]]", expectedOutput: "[[1,6],[8,10],[15,18]]", hidden: false },
      { input: "[[1,4],[4,5]]", expectedOutput: "[[1,5]]", hidden: false },
      { input: "[[1,4],[0,4]]", expectedOutput: "[[0,4]]", hidden: true },
      { input: "[[1,4],[2,3]]", expectedOutput: "[[1,4]]", hidden: true },
      { input: "[[1,2],[3,4],[5,6]]", expectedOutput: "[[1,2],[3,4],[5,6]]", hidden: true },
    ],
    language: "python",
    timeLimit: 2,
    memoryLimit: 256,
  },
]

interface EvalOutput {
  testResults?: { input: string; expectedOutput: string; actualOutput: string; passed: boolean }[]
  error?: string | null
  codeQuality?: {
    correctness: number
    timeComplexity: string
    spaceComplexity: string
    edgeCaseHandling: number
    codeStructure: number
    originality: number
  }
}

export default function AssessmentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)
  const router = useRouter()

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [submissions, setSubmissions] = useState<Map<string, Submission>>(new Map())
  const [output, setOutput] = useState<EvalOutput | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [language] = useState<Language>("python")
  const [timeLeft, setTimeLeft] = useState(3600) // 60 min
  const [totalViolations, setTotalViolations] = useState(0)
  const [warningLevel, setWarningLevel] = useState(0)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [interviewActive, setInterviewActive] = useState(false)
  const [lastSubmittedCode, setLastSubmittedCode] = useState("")
  const [lastScore, setLastScore] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load questions - with fallback for demo
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch("/api/questions/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            phase: "phase1",
            studentId: sessionId,
            count: 3,
          }),
        })
        const data = await res.json()
        if (data.questions?.length > 0) {
          setQuestions(data.questions)
        } else {
          // Use fallback questions for demo
          setQuestions(FALLBACK_QUESTIONS)
        }
      } catch (err) {
        console.error("Failed to load questions, using fallback:", err)
        setQuestions(FALLBACK_QUESTIONS)
      } finally {
        setLoading(false)
      }
    }
    loadQuestions()
  }, [language, sessionId])

  // Timer
  useEffect(() => {
    if (isLocked) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmitTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isLocked])

  const handleViolation = useCallback(
    async (type: ViolationType, description: string) => {
      try {
        const res = await fetch("/api/proctoring/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, type, description }),
        })
        const data = await res.json()
        setTotalViolations(data.totalViolations)
        setWarningLevel(data.warningLevel)

        if (data.action === "locked") {
          setIsLocked(true)
          router.push("/dashboard")
        }
      } catch (err) {
        console.error("Failed to log violation:", err)
      }
    },
    [sessionId, router]
  )

  async function handleRunCode(code: string) {
    if (!questions[currentQuestion]) return
    setIsRunning(true)
    setOutput(null)

    try {
      const question = questions[currentQuestion]
      const visibleTests = question.testCases.filter((tc) => !tc.hidden)

      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          testCases: visibleTests,
          timeLimit: question.timeLimit,
        }),
      })
      const data = await res.json()
      if (data.evaluation) {
        setOutput(data.evaluation)
      }
    } catch (err) {
      setOutput({ error: "Failed to run code. Please try again." })
    } finally {
      setIsRunning(false)
    }
  }

  async function handleSubmitCode(code: string) {
    if (!questions[currentQuestion]) return
    setIsSubmitting(true)
    setOutput(null)

    try {
      const question = questions[currentQuestion]

      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          testCases: question.testCases,
          timeLimit: question.timeLimit,
        }),
      })
      const data = await res.json()

      if (data.evaluation) {
        setOutput(data.evaluation)

        const passedTests = data.evaluation.testResults?.filter(
          (t: { passed: boolean }) => t.passed
        ).length || 0
        const totalTests = data.evaluation.testResults?.length || 1
        const score = Math.round((passedTests / totalTests) * 100)

        const submission: Submission = {
          id: `sub_${Date.now()}`,
          questionId: question.id,
          code,
          language,
          status: passedTests === totalTests ? "accepted" : "wrong_answer",
          passedTests,
          totalTests,
          executionTime: data.evaluation.executionTime,
          memoryUsed: data.evaluation.memoryUsed,
          score,
          submittedAt: new Date().toISOString(),
        }

        setSubmissions((prev) => new Map(prev).set(question.id, submission))
        setLastSubmittedCode(code)
        setLastScore(score)
        setInterviewActive(true)
      }
    } catch (err) {
      setOutput({ error: "Failed to submit code. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmitTest() {
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      })
      router.push("/dashboard")
    } catch (err) {
      console.error("Failed to submit test:", err)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Generating unique questions...</p>
          <p className="text-xs text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="mr-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">ProctorAI Assessment</span>
          <Badge variant="outline" className="text-xs">
            Question {currentQuestion + 1}/{questions.length}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-sm font-bold ${
              timeLeft <= 300
                ? "bg-destructive/10 text-destructive"
                : timeLeft <= 600
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-muted text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>

          {/* Violations */}
          <Badge
            variant={totalViolations > 0 ? "destructive" : "secondary"}
            className="text-xs"
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            {totalViolations} violations
          </Badge>

          {/* Submit Test */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSubmitDialog(true)}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Submit Test
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Questions & Output */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-border">
          <div className="flex-1 overflow-hidden p-3">
            <QuestionPanel
              questions={questions}
              currentIndex={currentQuestion}
              onSelectQuestion={setCurrentQuestion}
              submissions={submissions}
              output={output}
            />
          </div>

          {/* AI Interview (bottom of left panel) */}
          <div className="h-[280px] shrink-0 border-t border-border p-3">
            <AIInterview
              code={lastSubmittedCode}
              language={language}
              questionTitle={questions[currentQuestion]?.title}
              score={lastScore}
              isActive={interviewActive}
            />
          </div>
        </div>

        {/* Center - Code Editor */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-3">
            <CodeEditor
              language={language}
              onSubmit={handleSubmitCode}
              onRun={handleRunCode}
              isSubmitting={isSubmitting}
              isRunning={isRunning}
            />
          </div>
        </div>

        {/* Right Panel - Proctoring */}
        <div className="w-[260px] shrink-0 border-l border-border p-3">
          <div className="space-y-3">
            <ProctoringCamera
              sessionId={sessionId}
              onViolation={handleViolation}
              totalViolations={totalViolations}
              warningLevel={warningLevel}
            />

            {/* Submission Summary */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-2 text-xs font-medium text-foreground">Submissions</p>
              <div className="space-y-1.5">
                {questions.map((q, i) => {
                  const sub = submissions.get(q.id)
                  return (
                    <div key={q.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Q{i + 1}</span>
                      {sub ? (
                        <Badge
                          variant={sub.status === "accepted" ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {sub.status === "accepted" ? `${sub.score}%` : sub.status.replace("_", " ")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Next Question */}
            {currentQuestion < questions.length - 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-transparent"
                onClick={() => setCurrentQuestion((prev) => prev + 1)}
              >
                Next Question
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this test phase? You cannot return to these questions
              after submission. You have completed{" "}
              {submissions.size}/{questions.length} questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Working</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitTest}>
              Submit & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
