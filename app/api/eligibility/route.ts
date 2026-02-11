import { generateText, Output } from "ai"
import { z } from "zod"
import { store } from "@/lib/store"
import type { EligibilityDecision } from "@/lib/types"

const eligibilitySchema = z.object({
  status: z.enum(["eligible", "borderline", "not_eligible"]),
  confidence: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  scores: z.object({
    codingAccuracy: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    performance: z.number().min(0).max(100),
    consistency: z.number().min(0).max(100),
    integrity: z.number().min(0).max(100),
    behavioralTrust: z.number().min(0).max(100),
  }),
  recommendation: z.string(),
})

export async function POST(req: Request) {
  try {
    const { studentId } = (await req.json()) as { studentId: string }

    const student = await store.getStudent(studentId)
    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 })
    }

    const [results, sessions] = await Promise.all([
      store.getResults(studentId),
      store.getSessionsByStudent(studentId),
    ])

    const { output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: eligibilitySchema }),
      messages: [
        {
          role: "system",
          content: `You are an AI eligibility decision engine for campus placements.
Analyze the student's performance data and make a fair, explainable decision.

Decision criteria:
- Coding accuracy (weight: 30%)
- Problem-solving depth (weight: 25%)
- Performance/speed (weight: 15%)
- Consistency across attempts (weight: 15%)
- Integrity/trust score (weight: 15%)

Thresholds:
- Eligible: Overall score >= 70, integrity >= 80, no critical violations
- Borderline: Overall score 50-69, or integrity 60-79
- Not Eligible: Overall score < 50, or integrity < 60, or 8+ violations

Be fair but strict. Provide clear, auditable reasons for the decision.`,
        },
        {
          role: "user",
          content: `Student: ${student.name} (${student.registrationId})
College: ${student.college}
Total Violations: ${student.violations}
Integrity Score: ${student.integrityScore}

Test Results: ${JSON.stringify(results, null, 2)}

Sessions: ${sessions.length} total
Violations breakdown: ${JSON.stringify(
            sessions.flatMap((s) => s.violations.map((v) => v.type)),
            null,
            2
          )}`,
        },
      ],
    })

    if (output) {
      const decision: EligibilityDecision = {
        studentId,
        ...output,
      }
      await store.setDecision(decision)
      return Response.json({ decision })
    }

    return Response.json({ error: "Failed to generate decision" }, { status: 500 })
  } catch (error) {
    console.error("Eligibility decision error:", error)
    return Response.json({ error: "Failed to determine eligibility" }, { status: 500 })
  }
}
