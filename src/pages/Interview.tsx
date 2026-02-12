import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Send, User, Bot, Loader2, ArrowLeft, Upload, FileText, Code2, Volume2, VolumeX, Mic, MicOff, Download, CheckCircle, Award } from "lucide-react"
import type { Language } from "@/lib/types"

const SpeechRecognitionAPI = typeof window !== "undefined" && (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)

const LANGUAGES: Language[] = ["python", "javascript", "java", "cpp", "c"]

function getMessageText(parts: Array<{ type: string; text?: string }> | undefined): string {
  if (!parts || !Array.isArray(parts)) return ""
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

function speakText(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return
  window.speechSynthesis.cancel()
  const clean = text.replace(/\[CODING\]/g, "").trim()
  if (!clean) return
  const u = new SpeechSynthesisUtterance(clean)
  u.rate = 0.95
  u.pitch = 1
  u.volume = 1
  u.lang = "en-IN"
  const voices = window.speechSynthesis.getVoices()
  const en = voices.find((v) => v.lang.startsWith("en"))
  if (en) u.voice = en
  if (onEnd) u.onend = onEnd
  window.speechSynthesis.speak(u)
}

function VoiceAssistantView({ isStreaming, isSpeaking, isStarting }: { isStreaming: boolean; isSpeaking: boolean; isStarting?: boolean }) {
  const label = isStarting ? "Getting first question..." : isStreaming ? "Thinking..." : "AI is asking..."
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-primary/10 via-background to-primary/5 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex h-32 w-32 items-center justify-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/30 animate-voice-bubble"
              style={{
                width: 48 + i * 28,
                height: 48 + i * 28,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
          <div className="relative h-14 w-14 rounded-full bg-primary/60 flex items-center justify-center shadow-lg">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.1}s`, animationDuration: "0.6s" }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function InterviewPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState("")
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [step, setStep] = useState<"upload" | "interview">("upload")
  const [resumeText, setResumeText] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [codeValue, setCodeValue] = useState("")
  const [codeLanguage, setCodeLanguage] = useState<Language>("python")
  const [codeRunning, setCodeRunning] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [resumeParsing, setResumeParsing] = useState(false)
  const [languagesUsed, setLanguagesUsed] = useState<Set<string>>(new Set())
  const [exportLoading, setExportLoading] = useState(false)
  const [exportDone, setExportDone] = useState<"ok" | "csv" | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [interviewReport, setInterviewReport] = useState<{
    performance?: number
    communication?: number
    preparationRating?: number
    strengths?: string
    areasToImprove?: string
    questionTypes?: string[]
    codingType?: string
    language?: string
  } | null>(null)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const resumeTextRef = useRef("")
  const interviewSeedRef = useRef("")
  const lastSpokenIdRef = useRef<string | null>(null)
  const lastAssistantIdWeListenedForRef = useRef<string | null>(null)
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null)
  const startListeningRef = useRef<() => void>(() => {})
  resumeTextRef.current = resumeText

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/interview",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          messages,
          id,
          context: {
            mode: "post_test",
            resumeText: resumeTextRef.current,
            interviewSeed: interviewSeedRef.current || undefined,
          },
        },
      }),
    }),
  })

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch("/api/session", { credentials: "include" })
        const data = await res.json()
        if (cancelled) return
        const isStudent = data?.student != null
        const isCompleted = data?.student?.status === "completed"
        setAllowed(isStudent && isCompleted)
        if (!isStudent) {
          navigate("/", { replace: true })
          return
        }
        if (isStudent && !isCompleted) {
          navigate("/dashboard", { replace: true })
          return
        }
      } catch {
        if (!cancelled) setAllowed(false)
        navigate("/dashboard", { replace: true })
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
  const lastAssistantTextForSpeech = lastAssistantMessage ? getMessageText(lastAssistantMessage.parts) : ""

  useEffect(() => {
    if (!voiceOn || status === "streaming" || !lastAssistantMessage || !lastAssistantTextForSpeech.trim()) return
    if (lastSpokenIdRef.current === lastAssistantMessage.id) return
    lastSpokenIdRef.current = lastAssistantMessage.id
    const isCoding = lastAssistantTextForSpeech.includes("[CODING]")
    setIsAISpeaking(true)
    speakText(lastAssistantTextForSpeech, () => {
      setIsAISpeaking(false)
      if (SpeechRecognitionAPI && !isCoding && lastAssistantIdWeListenedForRef.current !== lastAssistantMessage.id) {
        lastAssistantIdWeListenedForRef.current = lastAssistantMessage.id
        startListeningRef.current()
      }
    })
  }, [voiceOn, status, lastAssistantMessage?.id, lastAssistantTextForSpeech])

  useEffect(() => {
    const isCoding = lastAssistantTextForSpeech.includes("[CODING]")
    if (status !== "streaming" && lastAssistantMessage && SpeechRecognitionAPI && !showCodeEditor && !isCoding && lastAssistantIdWeListenedForRef.current !== lastAssistantMessage.id) {
      const msgId = lastAssistantMessage.id
      const t = setTimeout(() => {
        if (lastAssistantIdWeListenedForRef.current !== msgId) {
          lastAssistantIdWeListenedForRef.current = msgId
          startListeningRef.current()
        }
      }, voiceOn ? 2000 : 500)
      return () => clearTimeout(t)
    }
  }, [status, lastAssistantMessage?.id, lastAssistantTextForSpeech, showCodeEditor, voiceOn])

  useEffect(() => {
    const voices = () => window.speechSynthesis.getVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = voices
    }
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis.cancel()
    }
  }, [])
  const lastAssistantText = lastAssistantTextForSpeech
  const isCodingQuestion = lastAssistantText.includes("[CODING]")

  useEffect(() => {
    setShowCodeEditor(isCodingQuestion)
  }, [isCodingQuestion])

  async function handleResumeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeFile(file)
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader()
      reader.onload = () => setResumeText(String(reader.result ?? ""))
      reader.readAsText(file)
      return
    }
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setResumeParsing(true)
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            resolve(dataUrl ? dataUrl.replace(/^data:.*?;base64,/, "") : "")
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const res = await fetch("/api/resume/parse-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pdf: base64 }),
        })
        const data = await res.json()
        if (data.text) setResumeText(data.text)
        else setResumeText("(Could not extract text from PDF. Please paste your resume below.)")
      } catch {
        setResumeText("(PDF upload failed. Please paste your resume text below.)")
      } finally {
        setResumeParsing(false)
      }
      return
    }
    setResumeText("(Unsupported file type. Please upload PDF or .txt, or paste text below.)")
  }

  async function handleStartInterview() {
    if (!resumeText.trim()) return
    interviewSeedRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setStep("interview")
    setStartLoading(true)
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resumeText: resumeTextRef.current, interviewSeed: interviewSeedRef.current }),
      })
      const data = await res.json()
      const firstMessage = data.text || "Hi! I'm your interviewer. What is your favourite data structure and why?"
      const userMsg = "I have uploaded my resume. Please start the interview."
      const assistantId = `assistant-${Date.now()}`
      setMessages([
        { id: `user-${Date.now()}`, role: "user", parts: [{ type: "text", text: userMsg }] },
        { id: assistantId, role: "assistant", parts: [{ type: "text", text: firstMessage }] },
      ])
      if (voiceOn) {
        setIsAISpeaking(true)
        speakText(firstMessage, () => {
          setIsAISpeaking(false)
          if (SpeechRecognitionAPI) {
            lastAssistantIdWeListenedForRef.current = assistantId
            startListeningRef.current()
          }
        })
      } else if (SpeechRecognitionAPI) {
        lastAssistantIdWeListenedForRef.current = assistantId
        setTimeout(() => startListeningRef.current(), 500)
      }
    } catch (err) {
      sendMessage({ text: "I have uploaded my resume. Please start the interview and ask your first question." })
    } finally {
      setStartLoading(false)
    }
  }

  async function handleStartWithoutResume() {
    interviewSeedRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setStep("interview")
    setStartLoading(true)
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resumeText: "", interviewSeed: interviewSeedRef.current }),
      })
      const data = await res.json()
      const firstMessage = data.text || "Hi! I'm your interviewer. What is your favourite data structure and why?"
      const userMsg = "I'd like to start without a resume. Please start the interview."
      const assistantId = `assistant-${Date.now()}`
      setMessages([
        { id: `user-${Date.now()}`, role: "user", parts: [{ type: "text", text: userMsg }] },
        { id: assistantId, role: "assistant", parts: [{ type: "text", text: firstMessage }] },
      ])
      if (voiceOn) {
        setIsAISpeaking(true)
        speakText(firstMessage, () => {
          setIsAISpeaking(false)
          if (SpeechRecognitionAPI) {
            lastAssistantIdWeListenedForRef.current = assistantId
            startListeningRef.current()
          }
        })
      } else if (SpeechRecognitionAPI) {
        lastAssistantIdWeListenedForRef.current = assistantId
        setTimeout(() => startListeningRef.current(), 500)
      }
    } catch (err) {
      sendMessage({ text: "Start the interview without a resume. Introduce yourself and ask your first question." })
    } finally {
      setStartLoading(false)
    }
  }

  async function handleRunAndSendCode() {
    if (!codeValue.trim() || codeRunning) return
    setLanguagesUsed((prev) => new Set(prev).add(codeLanguage))
    setCodeRunning(true)
    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: codeValue, language: codeLanguage }),
      })
      const data = await res.json()
      const stdout = data.stdout ?? "(no output)"
      const stderr = data.stderr ? `\nStderr: ${data.stderr}` : ""
      const reply = `My solution:\n\`\`\`${codeLanguage}\n${codeValue}\n\`\`\`\n\nOutput:\n${stdout}${stderr}`
      sendMessage({ text: reply })
      setCodeValue("")
      setShowCodeEditor(false)
    } catch (err) {
      sendMessage({ text: `My solution:\n\`\`\`${codeLanguage}\n${codeValue}\n\`\`\`\n\n(Error running code: ${err})` })
      setShowCodeEditor(false)
    } finally {
      setCodeRunning(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || status === "streaming") return
    sendMessage({ text: input })
    setInput("")
  }

  function startListening() {
    if (!SpeechRecognitionAPI || isListening || status === "streaming") return
    const Recognition = SpeechRecognitionAPI
    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-IN"
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? ""
      if (transcript.trim()) sendMessage({ text: transcript.trim() })
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }
  startListeningRef.current = startListening

  function stopListening() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  const apiBase = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE != null ? String(import.meta.env.VITE_API_BASE).replace(/\/$/, "") : ""

  async function handleExportToSheet() {
    if (messages.length === 0 || exportLoading) return
    setExportLoading(true)
    setExportDone(null)
    setExportError(null)
    try {
      const summaryRes = await fetch(`${apiBase}/api/interview/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages }),
      })
      let summaryData: Record<string, unknown> | null = null
      try {
        const json = await summaryRes.json()
        summaryData = json.summary != null ? json : { summary: json.summary }
      } catch {
        // ignore parse error
      }
      if (!summaryRes.ok) {
        const msg = summaryData && typeof (summaryData as { error?: string }).error === "string" ? (summaryData as { error: string }).error : `Summary failed (${summaryRes.status})`
        throw new Error(msg)
      }
      const summary = summaryData?.summary != null ? (summaryData.summary as Record<string, unknown>) : {}
      if (Object.keys(summary).length > 0) {
        setInterviewReport(summary as Parameters<typeof setInterviewReport>[0])
      }

      const exportRes = await fetch(`${apiBase}/api/sheets/interview-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          summary,
          languagesUsed: Array.from(languagesUsed),
        }),
      })
      const exportData = await exportRes.json()
      if (exportData.success && exportData.updatedRows != null) {
        setExportDone("ok")
      } else if (exportData.csv) {
        setExportDone("csv")
        const blob = new Blob([exportData.csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `interview-report-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setExportDone("ok")
      }
      if (!exportRes.ok && !exportData.csv) throw new Error(exportData.error || "Export failed")
    } catch (err) {
      setExportDone(null)
      const message = err instanceof Error ? err.message : "Export failed"
      setExportError(message)
      console.error(err)
    } finally {
      setExportLoading(false)
    }
  }

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-mesh">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!allowed) return null

  const isStreaming = status === "streaming"

  if (step === "upload") {
    return (
      <div className="flex min-h-screen flex-col bg-background bg-mesh">
        <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">AI Mock Interview</p>
            </div>
            <div className="w-24" />
          </div>
        </header>
        <main className="mx-auto flex flex-1 flex-col px-4 py-8 w-full max-w-2xl">
          <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Resume (optional)</h1>
                <p className="text-sm text-muted-foreground">Upload a resume for personalised questions, or start without one — you’ll hear the AI ask questions like a real interviewer.</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Resume (PDF or .txt)</label>
              <div className="flex gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  {resumeParsing ? "Extracting text..." : "Choose PDF or .txt"}
                  <input type="file" accept=".pdf,application/pdf,.txt,text/plain" className="hidden" onChange={handleResumeFile} disabled={resumeParsing} />
                </label>
                {resumeFile && <span className="text-xs text-muted-foreground self-center">{resumeFile.name}</span>}
              </div>
              <p className="text-xs text-muted-foreground">Upload PDF or .txt, or paste your resume text below.</p>
              <textarea
                className="w-full min-h-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                placeholder="Paste your resume text here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleStartInterview} disabled={!resumeText.trim() || startLoading} className="w-full gap-2">
                {startLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {startLoading ? "Starting interview..." : "Start Interview (with resume)"}
              </Button>
              <Button variant="outline" onClick={handleStartWithoutResume} disabled={startLoading} className="w-full gap-2">
                {startLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {startLoading ? "Starting..." : "Start without resume"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background bg-mesh">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AI Mock Interview</p>
              <p className="text-xs text-muted-foreground">Technical + HR • Interactive</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{messages.length} messages</Badge>
            <Button
              variant={voiceOn ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setVoiceOn((v) => !v)}
              title={voiceOn ? "AI speaks questions (click to mute)" : "Click to hear AI"}
            >
              {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="ml-1.5 text-xs">{voiceOn ? "Hear AI" : "Muted"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToSheet}
              disabled={messages.length === 0 || exportLoading}
              title="Rate interview and export to Google Sheet"
              className="gap-1.5"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : exportDone ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="text-xs">
                {exportDone === "ok" ? "In Sheet" : exportDone === "csv" ? "CSV" : "Export to Sheet"}
              </span>
            </Button>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto flex flex-1 flex-col px-4 py-6 w-full max-w-3xl">
        {exportError && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {exportError}
            {exportError.includes("404") && " — Make sure the dev server is running: pnpm run dev (both API and frontend)."}
          </div>
        )}
        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col flex-1 min-h-0 relative">
          {(status === "streaming" || isAISpeaking || startLoading) && (
            <VoiceAssistantView isStreaming={status === "streaming"} isSpeaking={isAISpeaking} isStarting={startLoading} />
          )}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6">
              {interviewReport && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Your interview evaluation</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Performance:</span> <span className="font-medium">{interviewReport.performance ?? "—"}/10</span></div>
                    <div><span className="text-muted-foreground">Communication:</span> <span className="font-medium">{interviewReport.communication ?? "—"}/10</span></div>
                    <div><span className="text-muted-foreground">Preparation:</span> <span className="font-medium">{interviewReport.preparationRating ?? "—"}/10</span></div>
                    {interviewReport.language && <div><span className="text-muted-foreground">Language:</span> <span className="font-medium">{interviewReport.language}</span></div>}
                  </div>
                  {interviewReport.strengths && <p className="text-sm"><span className="text-muted-foreground">Strengths:</span> {interviewReport.strengths}</p>}
                  {interviewReport.areasToImprove && <p className="text-sm"><span className="text-muted-foreground">Areas to improve:</span> {interviewReport.areasToImprove}</p>}
                </div>
              )}
              {messages.length === 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-5">
                  <p className="text-sm font-medium text-foreground mb-1">Interview started</p>
                  <p className="text-sm text-muted-foreground">You’ll The AI will ask the first question shortly. Mic turns on automatically after each question.</p>
                </div>
              )}
              {messages.map((msg) => {
                const text = getMessageText(msg.parts)
                const displayText = text.replace(/\[CODING\]/g, "").trim()
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        msg.role === "user" ? "bg-primary" : "bg-accent"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <Bot className="h-4 w-4 text-accent-foreground" />
                      )}
                    </div>
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div
                        className={`rounded-lg px-4 py-3 text-sm whitespace-pre-wrap flex-1 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {displayText}
                      </div>
                      {msg.role === "assistant" && displayText && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title="Hear this question again"
                          onClick={() => speakText(getMessageText(msg.parts))}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              {isStreaming && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">AI is thinking...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {showCodeEditor ? (
            <div className="border-t border-border p-4 bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Coding question — type your solution below</span>
                <Select value={codeLanguage} onValueChange={(v) => setCodeLanguage(v as Language)}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <textarea
                className="w-full h-40 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono resize-y"
                placeholder="Write your solution..."
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value)}
                spellCheck={false}
              />
              <Button onClick={handleRunAndSendCode} disabled={!codeValue.trim() || codeRunning} size="sm" className="gap-2">
                {codeRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code2 className="h-4 w-4" />}
                Run & Send to interviewer
              </Button>
            </div>
          ) : (
            <div className="border-t border-border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">You’ll {isListening ? "Listening... Speak your answer. Mic turns on automatically after each question." : "Mic turns on automatically after each question. Or type below."}</p>
              <div className="flex gap-2 items-center">
                {SpeechRecognitionAPI ? (
                  <>
                    {isListening ? (
                      <Button type="button" variant="destructive" size="sm" onClick={stopListening} className="gap-2 shrink-0">
                        <MicOff className="h-4 w-4" /> Stop
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={startListening} disabled={isStreaming} className="gap-2 shrink-0">
                        <Mic className="h-4 w-4" /> Start mic
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">or</span>
                  </>
                ) : null}
                <form onSubmit={handleSubmit} className="flex gap-2 flex-1 min-w-0">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Or type your answer..."
                    disabled={isStreaming}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!input.trim() || isStreaming} size="icon">
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
