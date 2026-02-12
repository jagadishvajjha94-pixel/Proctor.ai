"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, XCircle, Clock, AlertCircle, Play } from "lucide-react"
import type { Question, Submission } from "@/lib/types"

interface QuestionPanelProps {
  questions: Question[]
  currentIndex: number
  onSelectQuestion: (index: number) => void
  submissions: Map<string, Submission>
  output?: {
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
  } | null
}

export function QuestionPanel({
  questions,
  currentIndex,
  onSelectQuestion,
  submissions,
  output,
}: QuestionPanelProps) {
  const question = questions[currentIndex]

  if (!question) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    )
  }

  const difficultyColors = {
    easy: "bg-accent/10 text-accent border-accent/20",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    hard: "bg-destructive/10 text-destructive border-destructive/20",
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card overflow-hidden text-left">
      {/* Question Tabs - scrollable for 100 questions */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0">
        {questions.map((q, i) => {
          const sub = submissions.get(q.id)
          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                i === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : sub?.status === "accepted"
                    ? "bg-accent/10 text-accent"
                    : sub
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {i + 1}
            </button>
          )
        })}
        </div>
      </div>

      {/* Question Content - scrollable with visible scrollbar */}
      <Tabs defaultValue="problem" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 shrink-0 w-fit">
          <TabsTrigger value="problem">Problem</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
        </TabsList>

        <TabsContent value="problem" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <div className="question-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 text-left">
            <div className="space-y-4 py-2">
              {/* Title & Difficulty */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{question.title}</h2>
                  <Badge
                    variant="outline"
                    className={difficultyColors[question.difficulty]}
                  >
                    {question.difficulty}
                  </Badge>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {question.category.replace("_", " ")}
                </Badge>
              </div>

              {/* Description */}
              <div className="text-sm leading-relaxed text-foreground">
                <p className="whitespace-pre-wrap">{question.description}</p>
              </div>

              {/* Constraints */}
              {question.constraints.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Constraints</h3>
                  <ul className="space-y-1">
                    {question.constraints.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        <code className="font-mono text-xs">{c}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {question.examples.map((ex, i) => (
                <div key={i} className="rounded-lg bg-muted p-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Example {i + 1}</h3>
                  <div className="space-y-2 font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground">Input: </span>
                      <span className="text-foreground">{ex.input}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Output: </span>
                      <span className="text-foreground">{ex.output}</span>
                    </div>
                    {ex.explanation && (
                      <div className="mt-2 border-t border-border pt-2 font-sans text-xs text-muted-foreground">
                        {ex.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Time/Memory */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Time Limit: {question.timeLimit}s
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Memory: {question.memoryLimit}MB
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="output" className="flex-1 flex min-h-0 flex-col overflow-hidden">
          <ScrollArea className="h-full min-h-0 flex-1 px-4 pb-4 [&>div]:!h-full [&>div>div]:!max-h-full">
            <div className="space-y-4 py-2">
              {output ? (
                <>
                  {/* Test Results */}
                  {output.testResults && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Test Results</h3>
                      {output.testResults.map((tr, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 ${
                            tr.passed ? "border-accent/20 bg-accent/5" : "border-destructive/20 bg-destructive/5"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {tr.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-accent" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="text-sm font-medium text-foreground">
                              Test Case {i + 1}
                            </span>
                          </div>
                          <div className="space-y-1 font-mono text-xs">
                            <div>
                              <span className="text-muted-foreground">Input: </span>
                              {tr.input}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expected: </span>
                              {tr.expectedOutput}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Got: </span>
                              <span className={tr.passed ? "text-accent" : "text-destructive"}>
                                {tr.actualOutput}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Code Quality */}
                  {output.codeQuality && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Code Quality</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Correctness</p>
                          <p className="text-lg font-bold text-foreground">{output.codeQuality.correctness}%</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Edge Cases</p>
                          <p className="text-lg font-bold text-foreground">{output.codeQuality.edgeCaseHandling}%</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Time Complexity</p>
                          <p className="text-sm font-mono font-bold text-foreground">{output.codeQuality.timeComplexity}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Space Complexity</p>
                          <p className="text-sm font-mono font-bold text-foreground">{output.codeQuality.spaceComplexity}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Code Structure</p>
                          <p className="text-lg font-bold text-foreground">{output.codeQuality.codeStructure}%</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Originality</p>
                          <p className="text-lg font-bold text-foreground">{output.codeQuality.originality}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {output.error && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <pre className="mt-1 font-mono text-xs text-destructive/80">{output.error}</pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                  <Play className="mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Run or submit your code to see results</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
