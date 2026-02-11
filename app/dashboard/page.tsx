"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Shield,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  User,
  Trophy,
  Target,
  XCircle,
  ArrowLeft // Added ArrowLeft import
} from "lucide-react"
import type { Language, Student, EligibilityDecision, TestSession } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DashboardPage() {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR("/api/session", fetcher)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("python")
  const [starting, setStarting] = useState(false)

  const student: Student | null = data?.student ?? null
  const sessions: TestSession[] = data?.sessions ?? []
  const decision: EligibilityDecision | null = data?.decision ?? null

  // Don't redirect - allow demo access

  async function handleStartTest() {
    setStarting(true)
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", language: selectedLanguage }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/assessment/${data.session.id}`)
      }
    } finally {
      setStarting(false)
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }

  if (isLoading || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-mesh">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const completedPhases = sessions.filter((s) => s.status === "completed").length
  const totalPhases = 4 // 2 attempts x 2 phases
  const progressPercent = (completedPhases / totalPhases) * 100

  const phaseLabels: Record<string, string> = {
    phase1: "Phase 1 - Screening",
    phase2: "Phase 2 - Advanced",
  }

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    not_started: { label: "Ready to Start", variant: "outline" },
    in_progress: { label: "In Progress", variant: "default" },
    completed: { label: "Completed", variant: "secondary" },
    locked: { label: "Locked", variant: "destructive" },
  }

  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">ProctorAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {/* Updated here */}
              Back to Demo
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {student.name}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Student Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            {student.registrationId} — {student.college}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Status & Actions */}
          <div className="space-y-6 lg:col-span-2">
            {/* Progress Overview */}
            <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Assessment Progress</CardTitle>
                    <CardDescription>
                      Attempt {student.currentAttempt} of 2 - {phaseLabels[student.currentPhase]}
                    </CardDescription>
                  </div>
                  <Badge variant={statusConfig[student.status]?.variant || "outline"}>
                    {statusConfig[student.status]?.label || student.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-medium text-foreground">{completedPhases}/{totalPhases} phases</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Phase Tracker */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((attempt) =>
                    ["phase1", "phase2"].map((phase) => {
                      const session = sessions.find(
                        (s) => s.attempt === attempt && s.phase === phase
                      )
                      const isCurrent =
                        student.currentAttempt === attempt && student.currentPhase === phase
                      const isCompleted = session?.status === "completed"

                      return (
                        <div
                          key={`${attempt}-${phase}`}
                          className={`flex items-center gap-3 rounded-lg border p-3 ${
                            isCurrent
                              ? "border-primary bg-primary/5"
                              : isCompleted
                                ? "border-accent/30 bg-accent/5"
                                : "border-border"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                          ) : isCurrent ? (
                            <Clock className="h-5 w-5 shrink-0 text-primary" />
                          ) : (
                            <div className="h-5 w-5 shrink-0 rounded-full border-2 border-border" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Attempt {attempt} - {phaseLabels[phase]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isCompleted
                                ? `Completed - ${session?.submissions.length || 0} submissions`
                                : isCurrent
                                  ? "Current"
                                  : "Pending"}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Start Test / Resume */}
            {student.status !== "completed" && student.status !== "locked" && (
              <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    {student.status === "in_progress" ? "Resume Assessment" : "Start Assessment"}
                  </CardTitle>
                  <CardDescription>
                    {student.status === "in_progress"
                      ? "Continue your current assessment session."
                      : "Select your preferred programming language and begin."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    {student.status !== "in_progress" && (
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-foreground">Programming Language</label>
                        <Select
                          value={selectedLanguage}
                          onValueChange={(v) => setSelectedLanguage(v as Language)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="cpp">C++</SelectItem>
                            <SelectItem value="c">C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={handleStartTest} disabled={starting} className="gap-2">
                      <Code2 className="h-4 w-4" />
                      {starting
                        ? "Preparing..."
                        : student.status === "in_progress"
                          ? "Resume Test"
                          : "Begin Assessment"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Eligibility Decision */}
            {decision && (
              <Card className={
                decision.status === "eligible"
                  ? "border-accent/30"
                  : decision.status === "borderline"
                    ? "border-yellow-500/30"
                    : "border-destructive/30"
              }>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {decision.status === "eligible" ? (
                      <Trophy className="h-6 w-6 text-accent" />
                    ) : decision.status === "borderline" ? (
                      <AlertTriangle className="h-6 w-6 text-yellow-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-destructive" />
                    )}
                    <div>
                      <CardTitle className="text-foreground">Eligibility Decision</CardTitle>
                      <CardDescription>
                        {decision.status === "eligible"
                          ? "Eligible for Campus Drive"
                          : decision.status === "borderline"
                            ? "Borderline - Manual Review"
                            : "Not Eligible"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {Object.entries(decision.scores).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        <p className="text-lg font-bold text-foreground">{value}%</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium text-foreground">Recommendation</p>
                    <p className="mt-1 text-sm text-muted-foreground">{decision.recommendation}</p>
                  </div>
                  {decision.reasons.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Reasons</p>
                      <ul className="space-y-1">
                        {decision.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Locked Account */}
            {student.status === "locked" && (
              <Card className="border-destructive/30">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Account Locked</p>
                    <p className="text-sm text-muted-foreground">
                      Your account has been locked due to integrity violations. Contact your placement coordinator.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Integrity Score */}
            <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Integrity Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={
                          student.integrityScore >= 80
                            ? "hsl(var(--accent))"
                            : student.integrityScore >= 60
                              ? "hsl(var(--warning))"
                              : "hsl(var(--destructive))"
                        }
                        strokeWidth="3"
                        strokeDasharray={`${student.integrityScore}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-lg font-bold text-foreground">{student.integrityScore}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {student.integrityScore >= 80
                        ? "Good Standing"
                        : student.integrityScore >= 60
                          ? "Needs Attention"
                          : "Critical"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.violations} violation{student.violations !== 1 ? "s" : ""} recorded
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Phases Completed
                  </div>
                  <span className="text-sm font-medium text-foreground">{completedPhases}/{totalPhases}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Code2 className="h-4 w-4" />
                    Total Submissions
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {sessions.reduce((sum, s) => sum + s.submissions.length, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Violations
                  </div>
                  <span className="text-sm font-medium text-foreground">{student.violations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Language
                  </div>
                  <span className="text-sm font-medium text-foreground capitalize">{student.language}</span>
                </div>
              </CardContent>
            </Card>

            {/* Session History */}
            {sessions.length > 0 && (
              <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground">Session History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          Attempt {session.attempt} - {phaseLabels[session.phase]}
                        </p>
                        <Badge
                          variant={
                            session.status === "completed" ? "secondary" : session.status === "in_progress" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {session.status === "completed" ? "Done" : session.status === "in_progress" ? "Active" : "Locked"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.submissions.length} submissions, {session.violations.length} violations
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
