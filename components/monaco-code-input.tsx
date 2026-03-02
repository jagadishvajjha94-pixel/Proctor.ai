"use client"

import React, { useCallback, useRef, useEffect } from "react"
import Editor from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import type { Language } from "@/lib/types"

const MONACO_LANG: Record<Language, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
  c: "c",
}

const KEY_V = 86
const KEY_C = 67
const KEY_X = 88

interface MonacoCodeInputProps {
  value: string
  onChange: (value: string) => void
  language: Language
  placeholder?: string
  height?: number | string
  disableCopyPaste?: boolean
}

export function MonacoCodeInput({
  value,
  onChange,
  language,
  placeholder = "Write your solution...",
  height = 160,
  disableCopyPaste = true,
}: MonacoCodeInputProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const keyDownDisposable = useRef<{ dispose: () => void } | null>(null)

  useEffect(() => {
    return () => {
      keyDownDisposable.current?.dispose()
      keyDownDisposable.current = null
    }
  }, [])

  const handleMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance
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
    [disableCopyPaste]
  )

  const handleChange = useCallback(
    (v: string | undefined) => {
      onChange(v ?? "")
    },
    [onChange]
  )

  return (
    <div
      className="rounded-lg border border-border overflow-hidden"
      onPaste={disableCopyPaste ? (e) => e.preventDefault() : undefined}
      onCopy={disableCopyPaste ? (e) => e.preventDefault() : undefined}
      onCut={disableCopyPaste ? (e) => e.preventDefault() : undefined}
      onContextMenu={disableCopyPaste ? (e) => e.preventDefault() : undefined}
    >
      <Editor
        height={typeof height === "number" ? `${height}px` : height}
        defaultLanguage={MONACO_LANG[language]}
        language={MONACO_LANG[language]}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          padding: { top: 8 },
        }}
      />
    </div>
  )
}
