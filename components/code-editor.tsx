"use client"

import React, { useState, useCallback, useEffect } from "react"
import Editor from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Send, RotateCcw, Loader2 } from "lucide-react"
import type { Language } from "@/lib/types"

// Monaco key codes: V=86, C=67, X=88
const KEY_V = 86
const KEY_C = 67
const KEY_X = 88

const LANGUAGE_TEMPLATES: Record<Language, string> = {
  python: `# Write your solution here\ndef solution():\n    pass\n\n# Read input and call your function\nif __name__ == "__main__":\n    solution()`,
  javascript: `// Write your solution here\nfunction solution() {\n  // Your code here\n}\n\n// Read input and call your function\nsolution();`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Your code here\n    }\n}`,
  cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Your code here\n    return 0;\n}`,
}

const MONACO_LANG: Record<Language, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
  c: "c",
}

interface CodeEditorProps {
  language: Language
  onSubmit: (code: string) => Promise<void>
  onRun: (code: string) => Promise<void>
  isSubmitting: boolean
  isRunning: boolean
  /** If true, disables copy, paste, cut (anti-cheating) */
  disableCopyPaste?: boolean
}

export function CodeEditor({ language, onSubmit, onRun, isSubmitting, isRunning, disableCopyPaste = true }: CodeEditorProps) {
  const [code, setCode] = useState(LANGUAGE_TEMPLATES[language])
  const [lineCount, setLineCount] = useState(LANGUAGE_TEMPLATES[language].split("\n").length)
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null)
  const keyDownDisposable = React.useRef<{ dispose: () => void } | null>(null)

  useEffect(() => {
    return () => {
      keyDownDisposable.current?.dispose()
      keyDownDisposable.current = null
    }
  }, [])

  const updateLineCount = useCallback((text: string) => {
    setLineCount(text.split("\n").length)
  }, [])

  const handleEditorMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance
      updateLineCount(editorInstance.getValue())

      if (disableCopyPaste) {
        keyDownDisposable.current?.dispose()
        keyDownDisposable.current = editorInstance.onKeyDown((e) => {
          const ctrlOrMeta = e.ctrlKey || e.metaKey
          if (ctrlOrMeta && (e.keyCode === KEY_C || e.keyCode === KEY_V || e.keyCode === KEY_X)) {
            e.preventDefault()
            e.stopPropagation()
          }
        })
      }
    },
    [disableCopyPaste, updateLineCount]
  )

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const v = value ?? ""
      setCode(v)
      updateLineCount(v)
    },
    [updateLineCount]
  )

  const handleReset = useCallback(() => {
    const tmpl = LANGUAGE_TEMPLATES[language]
    setCode(tmpl)
    setLineCount(tmpl.split("\n").length)
    editorRef.current?.setValue(tmpl)
  }, [language])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disableCopyPaste) e.preventDefault()
    },
    [disableCopyPaste]
  )

  const handleCopy = useCallback(
    (e: React.ClipboardEvent) => {
      if (disableCopyPaste) e.preventDefault()
    },
    [disableCopyPaste]
  )

  const handleCut = useCallback(
    (e: React.ClipboardEvent) => {
      if (disableCopyPaste) e.preventDefault()
    },
    [disableCopyPaste]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disableCopyPaste) e.preventDefault()
    },
    [disableCopyPaste]
  )

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs capitalize">
            {language}
          </Badge>
          <span className="text-xs text-muted-foreground">{lineCount} lines</span>
          {disableCopyPaste && (
            <span className="text-[10px] text-muted-foreground">Copy/paste disabled</span>
          )}
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

      <div
        className="relative flex flex-1 min-h-[280px] overflow-hidden"
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handleCut}
        onContextMenu={handleContextMenu}
      >
        <Editor
          height="100%"
          defaultLanguage={MONACO_LANG[language]}
          language={MONACO_LANG[language]}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            readOnly: false,
            copyWithSyntaxHighlighting: false,
            domReadOnly: false,
          }}
          loading={<div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading editor...</div>}
        />
      </div>
    </div>
  )
}
