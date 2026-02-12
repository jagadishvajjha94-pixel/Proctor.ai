import { generateText, Output } from "ai"
import { z } from "zod"
import { store } from "@/lib/store"
import { QUESTIONS_PER_PHASE } from "@/lib/constants"
import type { Language, TestPhase, Question } from "@/lib/types"
import crypto from "crypto"

const questionSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["medium", "hard"]),
  constraints: z.array(z.string()),
  examples: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      explanation: z.string().nullable(),
    })
  ),
  testCases: z.array(
    z.object({
      input: z.string(),
      expectedOutput: z.string(),
      hidden: z.boolean(),
    })
  ),
  timeLimit: z.number(),
  memoryLimit: z.number(),
})

const BLUEPRINTS: Record<TestPhase, { id: string; concept: string; category: "fundamentals" | "logic" | "optimization" | "real_world" }[]> = {
  phase1: [
    { id: "bp_array_manip", concept: "Array manipulation", category: "fundamentals" },
    { id: "bp_string_ops", concept: "String operations", category: "fundamentals" },
    { id: "bp_sorting", concept: "Sorting algorithms", category: "fundamentals" },
    { id: "bp_searching", concept: "Searching algorithms", category: "fundamentals" },
    { id: "bp_recursion", concept: "Recursion and backtracking", category: "logic" },
    { id: "bp_math_logic", concept: "Mathematical logic", category: "logic" },
    { id: "bp_pattern", concept: "Pattern recognition", category: "logic" },
    { id: "bp_data_struct", concept: "Basic data structures", category: "fundamentals" },
  ],
  phase2: [
    { id: "bp_dp", concept: "Dynamic programming", category: "optimization" },
    { id: "bp_graph", concept: "Graph algorithms", category: "real_world" },
    { id: "bp_tree", concept: "Tree operations", category: "real_world" },
    { id: "bp_greedy", concept: "Greedy algorithms", category: "optimization" },
    { id: "bp_system", concept: "System design coding", category: "real_world" },
    { id: "bp_concurrency", concept: "Concurrent programming patterns", category: "real_world" },
    { id: "bp_optimization", concept: "Code optimization", category: "optimization" },
    { id: "bp_api_design", concept: "API design patterns", category: "real_world" },
  ],
}

function generateQuestionHash(blueprint: string, title: string, description: string, constraints: string[]): string {
  const normalized = `${blueprint}:${title.trim().toLowerCase()}:${description.trim().slice(0, 500)}:${constraints.sort().join("|")}`
  return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 24)
}

const languageNames: Record<Language, string> = {
  c: "C",
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
}

const BATCH_SIZE = 5
const MAX_GENERATE_PER_REQUEST = 10 // cap per request to avoid timeout; client can poll until 100
const MAX_ATTEMPTS_PER_QUESTION = 4

async function generateOneQuestion(
  blueprint: { id: string; concept: string; category: "fundamentals" | "logic" | "optimization" | "real_world" },
  phase: TestPhase,
  language: Language,
  studentId: string,
  seenHashes: Set<string>,
  attempt: number
): Promise<Question | null> {
  const randomSeed = crypto.randomBytes(8).toString("hex")
  const constraintVariants = [
    `Strict time limit: ${phase === "phase1" ? "1" : "2"} second(s) - optimal complexity required`,
    `Input size up to 10^${phase === "phase1" ? "5" : "6"} - solution must scale`,
    `No brute force; expect O(n log n) or better for phase1, O(n) or optimal for phase2`,
    `Include corner cases: empty input, single element, large values, overflow-safe`,
  ]

  const { output } = await generateText({
    model: "openai/gpt-4o-mini",
    output: Output.object({ schema: questionSchema }),
    messages: [
      {
        role: "system",
        content: `You are a HARD coding problem setter for campus placement and competitive programming.
Generate a DIFFICULT, NON-GENERIC problem based on: "${blueprint.concept}".
Language: ${languageNames[language]}.

RULES:
- Difficulty MUST be "hard" for phase2, and "medium" or "hard" for phase1. Never easy.
- Problem must require deep thinking: optimal substructure, invariants, or non-obvious algorithm.
- No classic textbook examples (e.g. no "reverse a string", "find max in array"). Create a unique scenario or twist.
- Require optimal time/space complexity; mention it in constraints.
- UNIQUENESS SEED: ${randomSeed} - use it to vary problem setting, numbers, and constraints so this problem is different from any standard problem.
- Generate exactly 6 test cases: 2 visible (examples), 4 hidden. Include edge cases and large inputs.
- Time limit: ${phase === "phase1" ? "1" : "2"} second(s). Memory limit: 256 MB.
- Output must be deterministic and exactly match expected format.`,
      },
      {
        role: "user",
        content: `Concept: ${blueprint.concept}. Constraints: ${constraintVariants.join("; ")}. Seed: ${randomSeed}. Student: ${studentId}. Attempt: ${attempt}.`,
      },
    ],
  })

  if (!output) return null

  const hash = generateQuestionHash(blueprint.id, output.title, output.description, output.constraints)
  if (seenHashes.has(hash)) return null

  const used = await store.isQuestionUsed(hash)
  if (used) return null

  await store.markQuestionUsed(hash)
  await store.markStudentSeenQuestion(studentId, hash)
  await store.incrementBlueprintUsage(blueprint.id)

  return {
    id: `q_${crypto.randomBytes(6).toString("hex")}`,
    blueprintId: blueprint.id,
    hash,
    title: output.title,
    description: output.description,
    difficulty: output.difficulty as "easy" | "medium" | "hard",
    category: blueprint.category,
    constraints: output.constraints,
    examples: output.examples.map((e) => ({
      input: e.input,
      output: e.output,
      explanation: e.explanation ?? undefined,
    })),
    testCases: output.testCases,
    language,
    timeLimit: output.timeLimit,
    memoryLimit: output.memoryLimit,
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      language: Language
      phase?: TestPhase
      studentId?: string
      sessionId?: string
      count?: number
    }

    let phase: TestPhase
    let studentId: string
    let language: Language = body.language ?? "python"
    let existingQuestions: Question[] = []

    if (body.sessionId) {
      const session = await store.getSession(body.sessionId)
      if (!session) {
        return Response.json({ error: "Session not found" }, { status: 404 })
      }
      phase = session.phase as TestPhase
      studentId = session.studentId
      existingQuestions = (session.questions ?? []) as Question[]
      if (existingQuestions.length >= QUESTIONS_PER_PHASE) {
        return Response.json({ questions: existingQuestions })
      }
    } else {
      if (!body.phase || !body.studentId) {
        return Response.json({ error: "phase and studentId required when sessionId not provided" }, { status: 400 })
      }
      phase = body.phase
      studentId = body.studentId
    }

    const needed = body.sessionId
      ? QUESTIONS_PER_PHASE - existingQuestions.length
      : Math.min(body.count ?? QUESTIONS_PER_PHASE, QUESTIONS_PER_PHASE)
    const count = body.sessionId
      ? Math.min(needed, MAX_GENERATE_PER_REQUEST)
      : needed

    const blueprints = BLUEPRINTS[phase]
    const seenHashes = new Set(existingQuestions.map((q) => q.hash))
    const studentSeen = await store.getStudentSeenQuestionHashes(studentId)
    studentSeen.forEach((h) => seenHashes.add(h))

    const questions: Question[] = [...existingQuestions]
    let generated = 0
    let blueprintIndex = 0
    let totalAttempts = 0
    const maxTotalAttempts = count * MAX_ATTEMPTS_PER_QUESTION * 3

    while (generated < count && totalAttempts < maxTotalAttempts) {
      const batchSize = Math.min(BATCH_SIZE, count - generated)
      const batch: Promise<Question | null>[] = []

      for (let i = 0; i < batchSize; i++) {
        const bp = blueprints[blueprintIndex % blueprints.length]
        blueprintIndex++
        batch.push(
          generateOneQuestion(bp, phase, language, studentId, seenHashes, totalAttempts + i)
        )
      }

      const results = await Promise.all(batch)
      for (const q of results) {
        if (q) {
          questions.push(q)
          seenHashes.add(q.hash)
          generated++
        }
      }
      totalAttempts += batchSize
    }

    if (body.sessionId && questions.length > 0) {
      const session = await store.getSession(body.sessionId)
      if (session) {
        session.questions = questions
        await store.setSession(session)
      }
    }

    return Response.json({ questions })
  } catch (error) {
    console.error("Question generation error:", error)
    return Response.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
