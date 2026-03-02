/**
 * AI question generation - DSA + System Design, unique per student
 */
import { generateText, Output } from "ai"
import { z } from "zod"
import crypto from "crypto"
import { generateQuestionHash, isHashUsed, markHashUsed, markHashSeenByStudent, getSeenHashesForStudent } from "./uniqueness-checker"
import { prisma } from "../db"

const questionSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["easy", "medium", "hard", "very_hard"]),
  constraints: z.array(z.string()),
  examples: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string().nullable() })),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string(), hidden: z.boolean() })),
})

const CATEGORIES = ["dsa", "system_design"] as const
const DIFFICULTIES = ["easy", "medium", "hard", "very_hard"] as const

export async function generateUniqueQuestion(params: {
  category: "dsa" | "system_design"
  difficulty: string
  studentId: string
  language: string
}): Promise<{ title: string; description: string; difficulty: string; examples: { input: string; output: string; explanation?: string }[]; testCases: { input: string; expectedOutput: string; hidden: boolean }[]; constraints: string[]; uniqueHash: string } | null> {
  const { category, difficulty, studentId, language } = params
  const seenHashes = await getSeenHashesForStudent(studentId)
  const seed = crypto.randomBytes(8).toString("hex")

  for (let attempt = 0; attempt < 4; attempt++) {
    const prompt =
      category === "dsa"
        ? `Generate a ${difficulty} DSA coding problem. Use seed ${seed} for uniqueness. Output JSON.`
        : `Generate a ${difficulty} System Design scenario (describe the system to design, requirements). Use seed ${seed}. Output JSON with title, description, constraints, examples (input/output), testCases (input, expectedOutput, hidden).`

    const { output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: questionSchema }),
      messages: [
        {
          role: "system",
          content: `You are a coding interview problem setter. Generate unique problems. Use the seed to vary the problem. Output exactly 6 test cases (2 visible, 4 hidden). Time limit 2s, memory 256MB.`,
        },
        { role: "user", content: prompt },
      ],
    })

    if (!output) continue

    const hash = generateQuestionHash(
      category,
      difficulty,
      output.title,
      output.description,
      output.constraints
    )
    if (seenHashes.has(hash)) continue
    if (await isHashUsed(hash)) continue

    await markHashUsed(hash)
    await markHashSeenByStudent(studentId, hash)

    await prisma.questionGenerationLog.create({
      data: {
        generationParams: { category, difficulty, studentId },
        generatedQuestionId: null,
        uniquenessVerificationStatus: "verified",
      },
    })

    return {
      title: output.title,
      description: output.description,
      difficulty: output.difficulty,
      examples: output.examples.map((e) => ({ input: e.input, output: e.output, explanation: e.explanation ?? undefined })),
      testCases: output.testCases,
      constraints: output.constraints,
      uniqueHash: hash,
    }
  }
  return null
}
