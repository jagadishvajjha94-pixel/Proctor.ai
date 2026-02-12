"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Send, RotateCcw, Loader2 } from "lucide-react"
import type { Language } from "@/lib/types"

const LANGUAGE_TEMPLATES: Record<Language, string> = {
  python: `# Write your solution here\ndef solution():\n    pass\n\n# Read input and call your function\nif __name__ == "__main__":\n    solution()`,
  javascript: `// Write your solution here\nfunction solution() {\n  // Your code here\n}\n\n// Read input and call your function\nsolution();`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Your code here\n    }\n}`,
  cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Your code here\n    return 0;\n}`,
}

interface CodeEditorProps {
  language: Language
  onSubmit: (code: string) => Promise<void>
  onRun: (code: string) => Promise<void>
  isSubmitting: boolean
  isRunning: boolean
}

export function CodeEditor({ language, onSubmit, onRun, isSubmitting, isRunning }: CodeEditorProps) {
  const [code, setCode] = useState(LANGUAGE_TEMPLATES[language])
  const [lineCount, setLineCount] = useState(
    LANGUAGE_TEMPLATES[language].split("\n").length
  )

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    setLineCount(newCode.split("\n").length)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault()
        const target = e.target as HTMLTextAreaElement
        const start = target.selectionStart
        const end = target.selectionEnd
        const newCode = code.substring(0, start) + "    " + code.substring(end)
        setCode(newCode)
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 4
        })
      }
    },
    [code]
  )

  const handleReset = useCallback(() => {
    setCode(LANGUAGE_TEMPLATES[language])
    setLineCount(LANGUAGE_TEMPLATES[language].split("\n").length)
  }, [language])

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs capitalize">
            {language}
          </Badge>
          <span className="text-xs text-muted-foreground">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={isSubmitting || isRunning}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRun(code)}
            disabled={isRunning || isSubmitting}
          >
            {isRunning ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1 h-3.5 w-3.5" />
            )}
            Run
          </Button>
          <Button size="sm" onClick={() => onSubmit(code)} disabled={isSubmitting || isRunning}>
            {isSubmitting ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1 h-3.5 w-3.5" />
            )}
            Submit
          </Button>
        </div>
      </div>

      {/* Code Area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Line Numbers */}
        <div className="flex w-12 shrink-0 flex-col items-end border-r border-border bg-muted/50 px-2 py-3 font-mono text-xs leading-6 text-muted-foreground select-none">
          {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>
        {/* Textarea */}
        <textarea
          className="min-h-[280px] flex-1 resize-none bg-card p-3 font-mono text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Start coding..."
          aria-label="Code editor"
        />
      </div>
    </div>
  )
}
