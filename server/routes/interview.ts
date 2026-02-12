import { Router, Request, Response } from "express"
import { streamText, generateText, convertToModelMessages, type UIMessage } from "ai"
import { Output } from "ai"
import { z } from "zod"

const router = Router()

const interviewSummarySchema = z.object({
  questionTypes: z.array(z.string()).describe("e.g. Technical, HR, Coding"),
  codingType: z.string().describe("e.g. DSA-Array, String, Tree, N/A if no coding"),
  language: z.string().describe("Primary programming language used, e.g. Python, Java"),
  performance: z.number().min(1).max(10).describe("Technical/coding performance 1-10"),
  communication: z.number().min(1).max(10).describe("Communication clarity 1-10"),
  preparationRating: z.number().min(1).max(10).describe("Overall preparation for placement 1-10"),
  strengths: z.string().describe("Brief strengths"),
  areasToImprove: z.string().describe("Brief areas to improve"),
})

function getMessageTextFromParts(parts: Array<{ type: string; text?: string }> | undefined): string {
  if (!parts || !Array.isArray(parts)) return ""
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

// More specific routes first so they are not shadowed by POST /
router.post("/summary", async (req: Request, res: Response) => {
  try {
    const { messages } = (req.body || {}) as { messages: UIMessage[] }
    if (!messages?.length) {
      return res.status(400).json({ error: "messages required" })
    }

    const transcript = messages
      .map((m) => {
        const text = getMessageTextFromParts(m.parts)?.replace(/\[CODING\]/g, "").trim() || ""
        const role = m.role === "user" ? "Candidate" : "Interviewer"
        return `${role}: ${text}`
      })
      .filter((line) => line.length > 2)
      .join("\n\n")

    const { output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: interviewSummarySchema }),
      messages: [
        {
          role: "system",
          content: `You are an analyst. Based on this mock interview transcript, rate the candidate for placement preparation.
Output a JSON object with: questionTypes (array of question types asked, e.g. Technical, HR, Coding), codingType (topic of coding if any, e.g. DSA-Array, String, Tree, or N/A), language (primary programming language used), performance (1-10 technical/coding), communication (1-10 clarity and articulation), preparationRating (1-10 overall readiness for placement), strengths (brief), areasToImprove (brief). Be fair and consistent.`,
        },
        {
          role: "user",
          content: `Interview transcript:\n\n${transcript.slice(0, 12000)}`,
        },
      ],
    })

    return res.json({ summary: output })
  } catch (err) {
    console.error("Interview summary error:", err)
    return res.status(500).json({ error: "Failed to generate interview summary" })
  }
})

router.post("/start", async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as { resumeText?: string; interviewSeed?: string }
    const resumeText = (body.resumeText ?? "").trim()
    const interviewSeed = body.interviewSeed ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const systemPrompt = `You are a REAL HUMAN placement interviewer. The candidate is starting the interview NOW. You MUST respond with ONLY your first message: a brief greeting (one sentence) then IMMEDIATELY a direct question. No preamble. No "I'll start by...". Just: greeting + question.

Example: "Hi, I'm your interviewer today. Let's begin — what is your favourite data structure and why?"
Another: "Hello! I'm here to conduct your mock interview. Can you tell me about a project you've worked on recently?"

${resumeText ? `The candidate shared their resume. Ask a first question related to their experience or skills from the resume.\n\nResume excerpt:\n${resumeText.slice(0, 3000)}` : "The candidate chose no resume. Ask a general first question (e.g. favourite data structure, or introduce yourself and ask them to introduce themselves)."}

Use seed for variety: ${interviewSeed}. Output ONLY the greeting and first question, 1-3 sentences total.`

    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      system: systemPrompt,
      messages: [{ role: "user", content: "Start the interview now. Say your greeting and ask your first question." }],
    })

    return res.json({ text: (text || "").trim() || "Hi! Let's begin. What is your favourite programming language and why?" })
  } catch (err) {
    console.error("Interview start error:", err)
    return res.status(500).json({ error: "Failed to start interview", text: "Hi! I'm your interviewer. What is your favourite data structure and why?" })
  }
})

router.post("/", async (req: Request, res: Response) => {
  const { messages, context } = (req.body || {}) as {
    messages: UIMessage[]
    context?: {
      code?: string
      language?: string
      questionTitle?: string
      score?: number
      mode?: "during_test" | "post_test"
      resumeText?: string
      interviewSeed?: string
    }
  }

  const isPostTest = context?.mode === "post_test"
  const resumeText = context?.resumeText?.trim() || ""
  const interviewSeed = context?.interviewSeed || `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const systemPrompt = isPostTest
    ? `You are a REAL HUMAN placement interviewer conducting an INTERACTIVE mock interview. The candidate will HEAR your voice (text-to-speech) and their mic is ON — they will answer by speaking. You MUST drive the conversation by ASKING questions.

CRITICAL — YOU MUST ASK QUESTIONS:
- Your FIRST message: one short greeting (e.g. "Hi, I'm your interviewer today.") then IMMEDIATELY ask your first question. Do not wait for the candidate to speak first.
- EVERY message after that MUST end with a clear, direct question for the candidate. Never leave the candidate without a question to answer.
- If the candidate says nothing, "I don't know", or gives a short answer, ask a follow-up or rephrase. Keep the interview moving: you ask → they answer → you ask the next question.
- One question at a time. Short, spoken sentences. Sound like a real person in the room.

UNIQUE INTERVIEW (every time different):
- Use this seed to vary your questions: ${interviewSeed}
- Rotate among: DSA (arrays, trees, graphs, DP, strings), system design basics, projects, debugging, complexity, and behavioral (teamwork, failure, goals, strengths).
- Do NOT repeat the same set. Vary difficulty so each interview feels fresh.

${resumeText
  ? `RESUME: The candidate shared their resume. Use it to ask personalised technical questions (technologies, projects, skills). Still ask one clear question at a time.\n\nResume (excerpt):\n---\n${resumeText.slice(0, 4000)}\n---`
  : "NO RESUME: The candidate chose to start without a resume. Introduce yourself in one sentence, then immediately ask your first question (e.g. a general technical question or favourite data structure). Keep the interview valuable and unique."}

FLOW:
1. First message: brief greeting + your first question. The candidate will hear it and answer by voice.
2. Technical: 3–5 technical questions. For a coding question, describe the problem and end your message with exactly: [CODING]. Example: "Let's do a quick coding exercise: write a function that checks if a string is a palindrome. Use the code editor and click Run & Send when done. [CODING]"
3. When they submit code: brief comment, then one follow-up question or move on.
4. HR/behavioral: 2–4 questions — strengths, weakness, teamwork, "Tell me about a time when...", goals. Each message must end with a question.
5. Closing: after about 10–15 exchanges, give short verbal feedback (2 strengths, 1 area to improve, overall readiness) then one final closing question or "That's all from my side."
6. Always end coding questions with [CODING] so the code editor opens.`
    : `You are a senior technical interviewer for campus placement and code preparation. Your job is to deeply assess the candidate's problem-solving, coding rigor, and interview readiness.

${
  context?.code
    ? `The candidate wrote the following ${context.language || "code"} for the problem "${context.questionTitle || "coding assessment"}":
\`\`\`
${context.code}
\`\`\`
Score: ${context.score ?? "pending"}/100. Use this to probe their understanding and preparation.`
    : ""
}

INTERVIEW & CODE PREPARATION FOCUS:
1. Before/during coding: Ask how they would approach the problem, what data structures they considered, and why they chose this solution over alternatives.
2. Complexity: Demand exact Big-O time and space. Ask for a brief proof or intuition (e.g. why O(n log n) for their approach).
3. Edge cases: What edge cases did they consider? Would their code handle empty input, single element, duplicates, overflow?
4. Test cases: What test cases would they add to be confident? How would they test for correctness and performance?
5. Harder follow-ups: "What if constraints were 10x larger?" "How would you change this for streaming input?" "Can you do it in O(1) extra space?"
6. Be concise: 2-3 sentences per question. Be professional and strict; this is placement-level preparation.
7. After 5-6 exchanges, give a short summary: strengths, one improvement area, and readiness (strong / needs more practice / weak).`

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  result.pipeUIMessageStreamToResponse(res as any)
})

export default router
