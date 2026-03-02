import { Router, Request, Response } from "express"
import { generateText, Output } from "ai"
import { z } from "zod"
import crypto from "crypto"
import { store } from "../../lib/store"
import { getSession as getAuthSession } from "../auth"
import { QUESTION_REUSE_AFTER, QUESTIONS_PER_PHASE } from "../../lib/constants"
import type { Language, TestPhase, Question } from "../../lib/types"

const questionSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
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
    { id: "bp_array_manip", concept: "Array manipulation and indexing", category: "fundamentals" as const },
    { id: "bp_string_ops", concept: "String operations and parsing", category: "fundamentals" as const },
    { id: "bp_sorting", concept: "Sorting algorithms and comparators", category: "fundamentals" as const },
    { id: "bp_searching", concept: "Binary search and search variants", category: "fundamentals" as const },
    { id: "bp_recursion", concept: "Recursion and backtracking", category: "logic" as const },
    { id: "bp_math_logic", concept: "Mathematical logic and number theory", category: "logic" as const },
    { id: "bp_pattern", concept: "Pattern recognition and two pointers", category: "logic" as const },
    { id: "bp_data_struct", concept: "Stacks, queues, and hash maps", category: "fundamentals" as const },
    { id: "bp_sliding_window", concept: "Sliding window and subarray sums", category: "fundamentals" as const },
    { id: "bp_prefix_sum", concept: "Prefix sums and range queries", category: "fundamentals" as const },
    { id: "bp_bit_manip", concept: "Bit manipulation and bitwise ops", category: "logic" as const },
    { id: "bp_frequency", concept: "Frequency counting and anagrams", category: "fundamentals" as const },
  ],
  phase2: [
    { id: "bp_dp", concept: "Dynamic programming (1D and 2D)", category: "optimization" as const },
    { id: "bp_graph", concept: "Graph traversal (BFS/DFS) and shortest path", category: "real_world" as const },
    { id: "bp_tree", concept: "Binary trees and BST operations", category: "real_world" as const },
    { id: "bp_greedy", concept: "Greedy algorithms and scheduling", category: "optimization" as const },
    { id: "bp_system", concept: "System design coding (caches, rate limiters)", category: "real_world" as const },
    { id: "bp_concurrency", concept: "Concurrent programming patterns", category: "real_world" as const },
    { id: "bp_optimization", concept: "Code optimization and complexity", category: "optimization" as const },
    { id: "bp_api_design", concept: "API design and data structures", category: "real_world" as const },
    { id: "bp_trie", concept: "Tries and autocomplete", category: "real_world" as const },
    { id: "bp_heaps", concept: "Heaps and priority queues", category: "optimization" as const },
    { id: "bp_intervals", concept: "Interval merging and scheduling", category: "real_world" as const },
    { id: "bp_backtrack", concept: "Advanced backtracking and pruning", category: "logic" as const },
  ],
}

function generateQuestionHash(blueprintId: string, title: string, description: string, constraints: string[]): string {
  const normalized = `${blueprintId}:${title.trim().toLowerCase()}:${description.trim().slice(0, 500)}:${constraints.sort().join("|")}`
  return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 24)
}

/** Shuffle array deterministically by seed (same seed = same order). */
function shuffleWithSeed<T>(arr: T[], seed: string): T[] {
  const a = [...arr]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i) | 0
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 16807) >>> 0
    const j = h % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Fallback pool when AI fails or returns too few; shuffled per student to vary questions
function buildQuestionPool(): Omit<Question, "id" | "language">[] {
  const base = (hash: string, title: string, description: string, difficulty: "medium" | "hard", category: Question["category"], constraints: string[], examples: { input: string; output: string; explanation?: string }[], testCases: { input: string; expectedOutput: string; hidden: boolean }[], timeLimit: number) => ({
    blueprintId: hash,
    hash,
    title,
    description,
    difficulty,
    category,
    constraints,
    examples,
    testCases,
    timeLimit,
    memoryLimit: 256,
  })
  return [
    base("pool_01", "Subarray with Given XOR", "Given an array of integers and a target XOR value, find the number of subarrays with XOR equal to the target. You must do it in O(n) time.", "hard", "fundamentals", ["1 <= n <= 10^5", "0 <= A[i] <= 10^9"], [{ input: "A = [4,2,2,6,4], target = 6", output: "4", explanation: "Subarrays: [4,2], [6], [2,2,6], [4,2,2,6,4]" }], [{ input: "[4,2,2,6,4], 6", expectedOutput: "4", hidden: false }, { input: "[5,6,7,8], 5", expectedOutput: "2", hidden: true }]),
    base("pool_02", "Minimum Window Sort", "Given an array, find the length of the smallest contiguous subarray which if sorted would make the entire array sorted. Return 0 if already sorted.", "medium", "fundamentals", ["1 <= n <= 10^5"], [{ input: "[1,2,5,3,7,6,4,8]", output: "5", explanation: "Sort subarray [5,3,7,6,4]" }], [{ input: "[1,2,5,3,7,6,4,8]", expectedOutput: "5", hidden: false }, { input: "[1,2,3,4]", expectedOutput: "0", hidden: true }]),
    base("pool_03", "Longest K Unique Character Substring", "Given a string and integer K, find the length of the longest substring containing at most K distinct characters.", "medium", "fundamentals", ["1 <= len(s) <= 10^5", "1 <= K <= 26"], [{ input: 's = "aabacbebebe", K = 3', output: "7", explanation: "cbebebe has 3 distinct chars" }], [{ input: '"aabacbebebe", 3', expectedOutput: "7", hidden: false }, { input: '"aaaa", 1', expectedOutput: "4", hidden: true }]),
    base("pool_04", "Matrix Chain Multiplication Order", "Given dimensions of matrices, find the minimum number of scalar multiplications needed. Return the optimal count.", "hard", "optimization", ["2 <= n <= 100", "dimensions are positive"], [{ input: "dims = [40,20,30,10,30]", output: "26000", explanation: "Optimal: (A(40x20)(20x30)) then * (10x30)" }], [{ input: "[40,20,30,10,30]", expectedOutput: "26000", hidden: false }, { input: "[10,20,30]", expectedOutput: "6000", hidden: true }]),
    base("pool_05", "Alien Dictionary Order", "Given a sorted dictionary of an alien language, derive the order of characters. If multiple orders exist return smallest lexicographically. If invalid return empty.", "hard", "real_world", ["1 <= words <= 100", "1 <= word length <= 20"], [{ input: '["baa","abcd","abca","cab","cad"]', output: '"bdac"', explanation: "b < d < a < c" }], [{ input: '["baa","abcd","abca","cab","cad"]', expectedOutput: '"bdac"', hidden: false }, { input: '["z","x"]', expectedOutput: '"zx"', hidden: true }]),
    base("pool_06", "Maximum Path Sum in Binary Tree", "Given a binary tree, find the maximum path sum. A path is any sequence of nodes from some start to any end. At most one path need not pass through root.", "hard", "real_world", ["Number of nodes <= 10^5", "-10^4 <= node value <= 10^4"], [{ input: "root = [1,2,3]", output: "6", explanation: "Path 2-1-3" }], [{ input: "[1,2,3]", expectedOutput: "6", hidden: false }, { input: "[-10,9,20,null,null,15,7]", expectedOutput: "42", hidden: true }]),
    base("pool_07", "Task Scheduler with Cooldown", "Given tasks (each letter = task type) and cooldown n, find minimum time to finish all with idle slots. Same task needs n slots gap.", "medium", "optimization", ["1 <= tasks <= 10^4", "1 <= n <= 100"], [{ input: 'tasks = ["A","A","A","B","B","B"], n = 2', output: "8", explanation: "A -> B -> idle -> A -> B -> idle -> A -> B" }], [{ input: '["A","A","A","B","B","B"], 2', expectedOutput: "8", hidden: false }, { input: '["A","A","A","A"], 2', expectedOutput: "10", hidden: true }]),
    base("pool_08", "Number of Islands (with sinking)", "Given a 2D grid of 1s and 0s, and a list of positions to flip 1->0 one by one. After each flip, return the number of islands.", "hard", "real_world", ["1 <= rows, cols <= 200"], [{ input: "grid = [[1,1],[1,0]], positions = [[1,1],[0,0],[0,1]]", output: "[1,1,2]", explanation: "After each flip count islands" }], [{ input: "[[1,1],[1,0]]; [[1,1],[0,0],[0,1]]", expectedOutput: "[1,1,2]", hidden: false }, { input: "[[1],[1]]; [[0,0],[1,0]]", expectedOutput: "[1,2]", hidden: true }]),
    base("pool_09", "Split Array Largest Sum", "Given an array of non-negative integers and m, split into m non-empty subarrays. Minimize the largest sum among these subarrays.", "hard", "optimization", ["1 <= n <= 1000", "1 <= m <= min(50,n)"], [{ input: "nums = [7,2,5,10,8], m = 2", output: "18", explanation: "Best: [7,2,5] and [10,8]" }], [{ input: "[7,2,5,10,8], 2", expectedOutput: "18", hidden: false }, { input: "[1,2,3,4,5], 2", expectedOutput: "9", hidden: true }]),
    base("pool_10", "Word Ladder II", "Given beginWord, endWord and wordList, find all shortest transformation sequences from begin to end. Each step change one letter.", "hard", "real_world", ["1 <= word length <= 10", "1 <= wordList <= 5000"], [{ input: 'begin = "hit", end = "cog", list = ["hot","dot","dog","lot","log","cog"]', output: '[["hit","hot","dot","dog","cog"],["hit","hot","lot","log","cog"]]', explanation: "Two shortest paths" }], [{ input: '"hit","cog",["hot","dot","dog","lot","log","cog"]', expectedOutput: "2", hidden: false }, { input: '"a","c",["a","b","c"]', expectedOutput: "1", hidden: true }]),
    base("pool_11", "First Missing Positive", "Given an unsorted integer array, find the smallest missing positive integer. Must be O(n) time and O(1) extra space.", "hard", "fundamentals", ["1 <= n <= 10^5", "-2^31 <= nums[i] <= 2^31-1"], [{ input: "nums = [3,4,-1,1]", output: "2", explanation: "1 is present, 2 is missing" }], [{ input: "[3,4,-1,1]", expectedOutput: "2", hidden: false }, { input: "[1,2,0]", expectedOutput: "3", hidden: true }]),
    base("pool_12", "Trapping Rain Water II", "Given an m×n height map, compute how much water can be trapped after rain. Water can flow to 4 directions.", "hard", "optimization", ["1 <= m, n <= 200", "0 <= height <= 2*10^4"], [{ input: "[[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]]", output: "4", explanation: "Trapped at (1,2) etc" }], [{ input: "[[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]]", expectedOutput: "4", hidden: false }, { input: "[[3,3,3],[3,1,3],[3,3,3]]", expectedOutput: "0", hidden: true }]),
  ]
}

const QUESTION_POOL = buildQuestionPool()
const LANGUAGE_NAMES: Record<Language, string> = {
  c: "C", cpp: "C++", java: "Java", python: "Python", javascript: "JavaScript",
}

const router = Router()

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { language, phase, studentId: bodyStudentId, sessionId: bodySessionId, count = QUESTIONS_PER_PHASE } = (req.body || {}) as {
      language: Language
      phase: TestPhase
      studentId?: string
      sessionId?: string
      count?: number
    }

    let sessionId = bodySessionId ?? bodyStudentId ?? ""
    let session = await store.getSession(sessionId)
    let studentId = session?.studentId ?? ""
    if (!studentId) {
      const auth = await getAuthSession(req)
      if (auth?.role === "student") studentId = auth.id
    }
    if (!studentId) {
      return res.status(400).json({ error: "Could not resolve student (send sessionId or be logged in)" })
    }

    let attempt: 1 | 2 = 1
    let resolvedPhase: TestPhase = phase ?? "phase1"
    if (session) {
      attempt = session.attempt
      resolvedPhase = session.phase
    } else {
      const student = await store.getStudent(studentId)
      if (student) {
        attempt = student.currentAttempt
        resolvedPhase = student.currentPhase
      }
    }

    const studentSeenHashes = new Set(await store.getStudentSeenQuestionHashes(studentId))
    const blueprints = BLUEPRINTS[resolvedPhase]
    const usages = await Promise.all(blueprints.map(async (bp) => ({ bp, usage: await store.getBlueprintUsage(bp.id) })))
    const sortedByUsage = usages.sort((a, b) => a.usage - b.usage).map((x) => x.bp)
    const jumbleSeed = `${studentId}-${attempt}-${resolvedPhase}-${sessionId}-${Date.now()}`
    const shuffledBlueprints = shuffleWithSeed(sortedByUsage, jumbleSeed)

    const questions: Question[] = []
    const TARGET = count
    const MAX_ATTEMPTS = TARGET * 6
    let attempts = 0

    for (let bi = 0; questions.length < TARGET && attempts < MAX_ATTEMPTS; bi++) {
      const blueprint = shuffledBlueprints[bi % shuffledBlueprints.length]
      for (let retry = 0; retry < 3 && questions.length < TARGET; retry++) {
        attempts++
        const uniquenessSeed = `${crypto.randomBytes(12).toString("hex")}-${studentId}-${attempt}-${resolvedPhase}-${bi}-${retry}-${Date.now()}`
        try {
          const { output } = await generateText({
            model: "openai/gpt-4o-mini",
            output: Output.object({ schema: questionSchema }),
            messages: [
              {
                role: "system",
                content: `You are a coding problem setter for basic campus placement tests. Generate a UNIQUE BASIC coding problem.
Concept: "${blueprint.concept}". Language: ${LANGUAGE_NAMES[language]} — all examples and constraints must be appropriate for ${LANGUAGE_NAMES[language]}.
This student must NOT see the same problem twice. Use the UNIQUENESS SEED to vary: scenario, numbers, and constraints so the problem is different from any standard or previously generated problem.
UNIQUENESS SEED (use in story/numbers/constraints): ${uniquenessSeed}
Rules: BASIC only — difficulty must be "easy" or "medium" (no hard). Focus on fundamentals: arrays, strings, loops, conditionals, simple data structures. Language-specific syntax and idioms for ${LANGUAGE_NAMES[language]}. Exactly 6 test cases: 2 visible (examples), 4 hidden. Time limit: 2s. Memory: 256 MB. Output valid JSON only.`,
              },
              {
                role: "user",
                content: `Generate one basic problem for ${LANGUAGE_NAMES[language]}. Concept: ${blueprint.concept}. Uniqueness: ${uniquenessSeed}.`,
              },
            ],
          })

          if (!output) continue
          const hash = generateQuestionHash(blueprint.id, output.title, output.description, output.constraints)
          if (studentSeenHashes.has(hash)) continue
          const useCount = await store.getQuestionUseCount(hash)
          const canReuse = useCount === 0 || useCount >= QUESTION_REUSE_AFTER
          if (!canReuse) continue

          await store.incrementQuestionUse(hash)
          await store.markStudentSeenQuestion(studentId, hash)
          await store.incrementBlueprintUsage(blueprint.id)
          studentSeenHashes.add(hash)
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
          break
        } catch (err) {
          console.warn("AI question generation attempt failed:", err)
        }
      }
    }

    if (questions.length < TARGET) {
      const poolSeed = `${studentId}-${attempt}-${resolvedPhase}`
      const shuffledPool = shuffleWithSeed(QUESTION_POOL, poolSeed)
      for (let i = 0; questions.length < TARGET && i < shuffledPool.length; i++) {
        const template = shuffledPool[i]
        if (studentSeenHashes.has(template.hash)) continue
        questions.push({
          id: `q_${crypto.randomBytes(6).toString("hex")}`,
          blueprintId: template.blueprintId,
          hash: template.hash,
          title: template.title,
          description: template.description,
          difficulty: template.difficulty,
          category: template.category,
          constraints: template.constraints,
          examples: template.examples,
          testCases: template.testCases,
          language,
          timeLimit: template.timeLimit,
          memoryLimit: template.memoryLimit,
        })
        studentSeenHashes.add(template.hash)
        await store.markStudentSeenQuestion(studentId, template.hash)
      }
    }

    return res.json({ questions })
  } catch (error) {
    console.error("Question generation error:", error)
    return res.status(500).json({ error: "Failed to generate questions" })
  }
})

export default router
