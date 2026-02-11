import { generateText, Output } from "ai"
import { z } from "zod"
import { store } from "@/lib/store"
import type { Language, TestPhase, Question } from "@/lib/types"
import crypto from "crypto"

const questionSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["medium", "hard"]), // only medium or hard - no easy for placement prep
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

const BLUEPRINTS = {
  phase1: [
    { id: "bp_array_manip", concept: "Array manipulation", category: "fundamentals" as const },
    { id: "bp_string_ops", concept: "String operations", category: "fundamentals" as const },
    { id: "bp_sorting", concept: "Sorting algorithms", category: "fundamentals" as const },
    { id: "bp_searching", concept: "Searching algorithms", category: "fundamentals" as const },
    { id: "bp_recursion", concept: "Recursion and backtracking", category: "logic" as const },
    { id: "bp_math_logic", concept: "Mathematical logic", category: "logic" as const },
    { id: "bp_pattern", concept: "Pattern recognition", category: "logic" as const },
    { id: "bp_data_struct", concept: "Basic data structures", category: "fundamentals" as const },
  ],
  phase2: [
    { id: "bp_dp", concept: "Dynamic programming", category: "optimization" as const },
    { id: "bp_graph", concept: "Graph algorithms", category: "real_world" as const },
    { id: "bp_tree", concept: "Tree operations", category: "real_world" as const },
    { id: "bp_greedy", concept: "Greedy algorithms", category: "optimization" as const },
    { id: "bp_system", concept: "System design coding", category: "real_world" as const },
    { id: "bp_concurrency", concept: "Concurrent programming patterns", category: "real_world" as const },
    { id: "bp_optimization", concept: "Code optimization", category: "optimization" as const },
    { id: "bp_api_design", concept: "API design patterns", category: "real_world" as const },
  ],
}

// Content-based hash so the same problem is never repeated (no timestamp)
function generateQuestionHash(blueprint: string, title: string, description: string, constraints: string[]): string {
  const normalized = `${blueprint}:${title.trim().toLowerCase()}:${description.trim().slice(0, 500)}:${constraints.sort().join("|")}`
  return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 24)
}

export async function POST(req: Request) {
  try {
    const { language, phase, studentId, count = 3 } = (await req.json()) as {
      language: Language
      phase: TestPhase
      studentId: string
      count?: number
    }

    const blueprints = BLUEPRINTS[phase]
    // Select blueprints with lowest usage count for maximum uniqueness
    const usages = await Promise.all(blueprints.map(async (bp) => ({ bp, usage: await store.getBlueprintUsage(bp.id) })))
    const sortedBlueprints = usages.sort((a, b) => a.usage - b.usage).map((x) => x.bp)
    const selectedBlueprints = sortedBlueprints.slice(0, count)

    const languageNames: Record<Language, string> = {
      c: "C",
      cpp: "C++",
      java: "Java",
      python: "Python",
      javascript: "JavaScript",
    }

    const questions: Question[] = []
    const MAX_ATTEMPTS_PER_BLUEPRINT = 4 // retry if generated question was already used

    for (const blueprint of selectedBlueprints) {
      let added = false
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_BLUEPRINT && !added; attempt++) {
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
              content: `Concept: ${blueprint.concept}. Constraints: ${constraintVariants.join("; ")}. Seed for uniqueness: ${randomSeed}. Student: ${studentId}. Attempt: ${attempt + 1}.`,
            },
          ],
        })

        if (output) {
          const hash = generateQuestionHash(blueprint.id, output.title, output.description, output.constraints)
          const used = await store.isQuestionUsed(hash)
          if (!used) {
            await store.markQuestionUsed(hash)
            await store.incrementBlueprintUsage(blueprint.id)
            questions.push({
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
            })
            added = true
          }
        }
      }
    }

    return Response.json({ questions })
  } catch (error) {
    console.error("Question generation error:", error)
    return Response.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
