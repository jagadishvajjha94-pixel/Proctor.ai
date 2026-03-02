'use client';

import { useCallback, memo } from 'react';

/**
 * MCQ section: all answers kept in React state only.
 * No backend call per click; parent passes mcqAnswers object and setMcqAnswers.
 * Single JSON object for all MCQs when saving (scaling: one write per autosave).
 */
function MCQSection({ questions, mcqAnswers, setMcqAnswers }) {
  const handleSelect = useCallback(
    (questionId, optionIndex) => {
      setMcqAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    },
    [setMcqAnswers]
  );

  return (
    <section className="mcq-section">
      <h2 className="text-xl font-semibold mb-4">MCQ</h2>
      <ul className="space-y-6">
        {questions.map((q) => (
          <li key={q.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <p className="font-medium text-gray-900 mb-3">{q.question}</p>
            <ul className="space-y-2">
              {q.options.map((opt, idx) => (
                <li key={idx}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      checked={mcqAnswers[q.id] === idx}
                      onChange={() => handleSelect(q.id, idx)}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .mcq-section :global(label) {
          padding: 0.25rem 0;
        }
      `}</style>
    </section>
  );
}

export default memo(MCQSection);
