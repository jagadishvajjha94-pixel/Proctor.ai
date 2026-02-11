import { streamText, convertToModelMessages, type UIMessage } from "ai"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, context } = (await req.json()) as {
    messages: UIMessage[]
    context?: {
      code?: string
      language?: string
      questionTitle?: string
      score?: number
    }
  }

  const systemPrompt = `You are a senior technical interviewer for campus placement and code preparation. Your job is to deeply assess the candidate's problem-solving, coding rigor, and interview readiness.

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

  return result.toUIMessageStreamResponse()
}
