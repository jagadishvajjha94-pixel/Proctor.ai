'use client';

import { useState, useCallback, memo, useRef } from 'react';
import { runCode, compareOutput } from '@/utils/judge0';

const MAX_RUNS_PER_QUESTION = 20;
const LANGUAGES = ['python', 'cpp', 'java', 'javascript'];
const DELAY_BETWEEN_TEST_CASES_MS = 400;

/**
 * Coding section: code + language in state; max 20 runs per question.
 * Frontend calls Judge0 directly; score computed client-side. Sequential test runs with delay to avoid rate limits.
 */
function CodingSection({
  questions,
  codingAnswers,
  setCodingAnswers,
  runCounts,
  setRunCounts,
}) {
  const [running, setRunning] = useState(null);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const lastOutputKeyRef = useRef(null);

  const handleRun = useCallback(
    async (q) => {
      const key = q.id;
      const current = runCounts[key] || 0;
      if (current >= MAX_RUNS_PER_QUESTION) {
        setError(`Max ${MAX_RUNS_PER_QUESTION} runs per question reached.`);
        return;
      }
      const code = codingAnswers[key]?.code ?? '';
      const lang = codingAnswers[key]?.language ?? 'python';
      if (!code.trim()) {
        setError('Enter some code first.');
        return;
      }
      setError('');
      setRunning(key);
      setOutput('');
      try {
        setRunCounts((prev) => ({ ...prev, [key]: current + 1 }));
        let passed = 0;
        const totalTests = q.testCases.length;
        for (let i = 0; i < totalTests; i++) {
          const tc = q.testCases[i];
          setOutput(`Running test ${i + 1}/${totalTests}...`);
          const result = await runCode({
            sourceCode: code,
            language: lang,
            stdin: tc.input,
          });
          const actual = (result.stdout || '').trim();
          const expected = (tc.output || '').trim();
          if (compareOutput(actual, expected)) passed++;
          if (i < totalTests - 1) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
        const score = q.testCases.length
          ? Math.round((passed / q.testCases.length) * q.maxScore)
          : 0;
        const msg = `Passed ${passed}/${totalTests} test cases. Score: ${score}/${q.maxScore}`;
        setOutput(msg);
        lastOutputKeyRef.current = key;
        setCodingAnswers((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            code,
            language: lang,
            score,
          },
        }));
      } catch (err) {
        setError(err.message || 'Run failed');
        setOutput('');
      } finally {
        setRunning(null);
      }
    },
    [codingAnswers, setCodingAnswers, runCounts, setRunCounts]
  );

  const updateCode = useCallback(
    (qId, code, language) => {
      setCodingAnswers((prev) => ({
        ...prev,
        [qId]: {
          ...(prev[qId] || {}),
          code: code ?? prev[qId]?.code ?? '',
          language: language ?? prev[qId]?.language ?? 'python',
          score: prev[qId]?.score ?? 0,
        },
      }));
    },
    [setCodingAnswers]
  );

  return (
    <section className="coding-section">
      <h2 className="text-xl font-semibold mb-4">Coding</h2>
      {questions.map((q) => {
        const runsLeft = MAX_RUNS_PER_QUESTION - (runCounts[q.id] || 0);
        return (
          <div key={q.id} className="border rounded-lg p-4 bg-white shadow-sm mb-6">
            <h3 className="font-medium text-gray-900 mb-1">{q.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{q.description}</p>
            <p className="text-xs text-gray-500 mb-2">
              Max score: {q.maxScore} · Runs left: {runsLeft}/{MAX_RUNS_PER_QUESTION}
            </p>
            <div className="mb-2">
              <select
                value={codingAnswers[q.id]?.language ?? 'python'}
                onChange={(e) => updateCode(q.id, undefined, e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <textarea
              value={codingAnswers[q.id]?.code ?? ''}
              onChange={(e) => updateCode(q.id, e.target.value)}
              placeholder="Write your code here..."
              rows={12}
              className="w-full font-mono text-sm border rounded p-2"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRun(q)}
                disabled={running === q.id || runsLeft <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {running === q.id ? 'Running...' : 'Run Code'}
              </button>
            </div>
            {(running === q.id || (running === null && lastOutputKeyRef.current === q.id)) && output && (
              <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{output}</pre>
            )}
          </div>
        );
      })}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </section>
  );
}

export default memo(CodingSection);
