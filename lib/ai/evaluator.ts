/**
 * AI evaluation for code/answers - code quality, approach, communication
 */
import { generateText, Output } from "ai"
import { z } from "zod"

export interface EvaluationResult {
  codeQualityScore: number
  approachScore: number
  communicationScore: number
  edgeCasesHandled: boolean
  optimizationSuggestions: string | null
  overallFeedbackText: string
  recommendation: string
}

const evalSchema = z.object({
  codeQualityScore: z.number().min(0).max(100),
  approachScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  edgeCasesHandled: z.boolean(),
  optimizationSuggestions: z.string().nullable(),
  overallFeedbackText: z.string(),
  recommendation: z.string(),
})

export async function evaluateCodeAttempt(params: {
  questionTitle: string
  submittedCode: string
  isCorrect: boolean
  testCasesPassed: number
  totalTests: number
}): Promise<EvaluationResult> {
  const { questionTitle, submittedCode, isCorrect, testCasesPassed, totalTests } = params

  const { output } = await generateText({
    model: "openai/gpt-4o-mini",
    output: Output.object({ schema: evalSchema }),
    messages: [
      {
        role: "system",
        content: "Evaluate the coding attempt. Be constructive. Return JSON with scores 0-100.",
      },
      {
        role: "user",
        content: `Question: ${questionTitle}\nCode:\n${submittedCode}\nCorrect: ${isCorrect}, Passed: ${testCasesPassed}/${totalTests}. Provide evaluation.`,
      },
    ],
  })

  if (!output) {
    return {
      codeQualityScore: isCorrect ? 70 : 40,
      approachScore: isCorrect ? 75 : 35,
      communicationScore: 60,
      edgeCasesHandled: testCasesPassed === totalTests,
      optimizationSuggestions: null,
      overallFeedbackText: isCorrect ? "Solution passed tests." : "Solution did not pass all tests.",
      recommendation: isCorrect ? "Good work, consider edge cases." : "Review the failing test cases.",
    }
  }

  return {
    codeQualityScore: output.codeQualityScore,
    approachScore: output.approachScore,
    communicationScore: output.communicationScore,
    edgeCasesHandled: output.edgeCasesHandled,
    optimizationSuggestions: output.optimizationSuggestions,
    overallFeedbackText: output.overallFeedbackText,
    recommendation: output.recommendation,
  }
}

const spokenSchema = z.object({ score: z.number().min(0).max(100), feedback: z.string() })

export async function evaluateSpokenAnswer(params: {
  question: string
  transcript: string
}): Promise<{ score: number; feedback: string }> {
  const { question, transcript } = params

  const { output } = await generateText({
    model: "openai/gpt-4o-mini",
    output: Output.object({ schema: spokenSchema }),
    messages: [
      { role: "system", content: "Evaluate the spoken answer for coding approach and communication. Return JSON." },
      { role: "user", content: `Question: ${question}\nAnswer transcript: ${transcript}\nEvaluate.` },
    ],
  })

  return output
    ? { score: output.score, feedback: output.feedback }
    : { score: 50, feedback: "Evaluation unavailable." }
}
