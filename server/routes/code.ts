import { Router, Request, Response } from "express"
import { generateText, Output } from "ai"
import { z } from "zod"
import type { Language } from "../../lib/types"

const evaluationSchema = z.object({
  passed: z.boolean(),
  output: z.string(),
  executionTime: z.number(),
  memoryUsed: z.number(),
  error: z.string().nullable(),
  testResults: z.array(
    z.object({
      input: z.string(),
      expectedOutput: z.string(),
      actualOutput: z.string(),
      passed: z.boolean(),
    })
  ),
  codeQuality: z.object({
    correctness: z.number().min(0).max(100),
    timeComplexity: z.string(),
    spaceComplexity: z.string(),
    edgeCaseHandling: z.number().min(0).max(100),
    codeStructure: z.number().min(0).max(100),
    originality: z.number().min(0).max(100),
  }),
})

const router = Router()

router.post("/execute", async (req: Request, res: Response) => {
  try {
    const {
      code,
      language,
      testCases,
      timeLimit,
    } = (req.body || {}) as {
      code: string
      language: Language
      testCases: { input: string; expectedOutput: string; hidden: boolean }[]
      timeLimit: number
    }

    const languageNames: Record<Language, string> = {
      c: "C",
      cpp: "C++",
      java: "Java",
      python: "Python",
      javascript: "JavaScript",
    }

    const { output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: evaluationSchema }),
      messages: [
        {
          role: "system",
          content: `You are a strict code evaluator for campus placement and hard problem preparation.
Evaluate the ${languageNames[language]} code against the test cases. Simulate execution and produce EXACT expected outputs.

Grading (placement-level):
- Correctness: Output must match expected EXACTLY (no extra spaces, same format). Mark wrong_answer if any mismatch.
- Time/space: For hard problems expect optimal or near-optimal complexity; penalize brute force or unnecessary extra space.
- Edge cases: Deduct points for missing edge-case handling (empty input, single element, large N).
- Structure and originality: Clear logic and readable code; no trivial copy-paste solutions.
Time limit: ${timeLimit} seconds. Be strict; candidates are preparing for difficult interviews.`,
        },
        {
          role: "user",
          content: `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nTest Cases:\n${JSON.stringify(testCases, null, 2)}`,
        },
      ],
    })

    return res.json({ evaluation: output })
  } catch (error) {
    console.error("Code execution error:", error)
    return res.status(500).json({ error: "Failed to evaluate code" })
  }
})

/** Simple run for interview: no test cases, returns simulated stdout/stderr for given stdin */
router.post("/run", async (req: Request, res: Response) => {
  try {
    const { code, language, stdin } = (req.body || {}) as {
      code: string
      language: Language
      stdin?: string
    }
    if (!code || !language) {
      return res.status(400).json({ error: "code and language required" })
    }
    const languageNames: Record<Language, string> = {
      c: "C", cpp: "C++", java: "Java", python: "Python", javascript: "JavaScript",
    }
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      maxTokens: 500,
      messages: [
        {
          role: "user",
          content: `You simulate running ${languageNames[language]} code. Given the code and optional stdin, output ONLY what would be printed to stdout (and stderr if any), nothing else. No explanation.\n\nCode:\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\`\n${stdin ? `Stdin:\n${stdin}` : "No stdin."}\n\nOutput (stdout only):`,
        },
      ],
    })
    const stdout = (result?.text ?? "").trim() || "(no output)"
    return res.json({ stdout, stderr: "" })
  } catch (error) {
    console.error("Code run error:", error)
    return res.status(500).json({ error: "Failed to run code", stdout: "", stderr: String(error) })
  }
})

export default router
