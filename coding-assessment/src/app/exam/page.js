'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import Timer from '@/components/Timer';
import MCQSection from '@/components/MCQSection';
import CodingSection from '@/components/CodingSection';
import mcqQuestions from '@/data/mcqQuestions.json';
import codingQuestions from '@/data/codingQuestions.json';
import { computeMcqScore } from '@/utils/mcqScore';

const AUTOSAVE_BASE_MS = 90 * 1000;
const AUTOSAVE_JITTER_MS = 15 * 1000; // ±15s so users don't all hit at same time
const ENTRY_DELAY_MS = 5 * 60 * 1000; // 5 min max wait for entry throttling
const FINAL_SUBMIT_DELAY_MS_MIN = 0;
const FINAL_SUBMIT_DELAY_MS_MAX = 20 * 1000; // 0–20 s random delay before final submit
const SUBMIT_RETRY_ATTEMPTS = 2;
const SUBMIT_RETRY_DELAY_MS = [2000, 4000];

/**
 * Exam page: client-only. No SSR. Loads questions from static JSON.
 * Single submission row: mcq_answers + coding_answers JSON. Autosave every 90s.
 * Random 0–20s delay before final submit. Multi-tab submission prevented via sessionStorage.
 */
export default function ExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('exam_id') || process.env.NEXT_PUBLIC_EXAM_ID;
  const [studentId, setStudentId] = useState(null);
  const [examStartTime, setExamStartTime] = useState(null);
  const [examEndTime, setExamEndTime] = useState(null);
  const [totalSeconds, setTotalSeconds] = useState(3600);
  const [entryReady, setEntryReady] = useState(false);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [codingAnswers, setCodingAnswers] = useState({});
  const [runCounts, setRunCounts] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const autosaveTimerRef = useRef(null);
  const submittedRef = useRef(false);
  const saveInProgressRef = useRef(false);
  const lastSavedSnapshotRef = useRef(null); // { mcq, coding } to skip save when unchanged

  // Auth and entry throttling
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.replace('/login');
        return;
      }
      if (cancelled) return;
      setStudentId(session.user.id);
      // Entry throttling: random delay 0–5 min before allowing exam access
      const delay = Math.floor(Math.random() * ENTRY_DELAY_MS);
      await new Promise((r) => setTimeout(r, delay));
      if (cancelled) return;
      setEntryReady(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Restore draft from existing submission (single row)
  useEffect(() => {
    if (!entryReady || !studentId || !examId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('submissions')
        .select('mcq_answers, coding_answers')
        .eq('student_id', studentId)
        .eq('exam_id', examId)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.mcq_answers && typeof data.mcq_answers === 'object') setMcqAnswers(data.mcq_answers);
      if (data.coding_answers && typeof data.coding_answers === 'object') setCodingAnswers(data.coding_answers);
    })();
    return () => { cancelled = true; };
  }, [entryReady, studentId, examId]);

  // Exam window: use env or default 1 hr
  useEffect(() => {
    if (!entryReady || !examId) return;
    const start = process.env.NEXT_PUBLIC_EXAM_START
      ? new Date(process.env.NEXT_PUBLIC_EXAM_START).getTime()
      : Date.now();
    const end = process.env.NEXT_PUBLIC_EXAM_END
      ? new Date(process.env.NEXT_PUBLIC_EXAM_END).getTime()
      : start + 3600 * 1000;
    setExamStartTime(start);
    setExamEndTime(end);
    setTotalSeconds(Math.max(0, Math.floor((end - Date.now()) / 1000)));
  }, [entryReady, examId]);

  // Ensure single submission (prevent multiple tabs)
  useEffect(() => {
    const key = `exam_submitted_${examId}_${studentId}`;
    if (typeof window === 'undefined') return;
    const already = sessionStorage.getItem(key);
    if (already === '1') {
      setSubmitted(true);
      submittedRef.current = true;
      router.replace('/result');
    }
  }, [examId, studentId, router]);

  const computeTotalScore = useCallback(() => {
    const mcqScore = computeMcqScore(mcqQuestions, mcqAnswers);
    let codingScore = 0;
    Object.values(codingAnswers).forEach((v) => {
      if (v && typeof v.score === 'number') codingScore += v.score;
    });
    return mcqScore + codingScore;
  }, [mcqAnswers, codingAnswers]);

  const saveDraft = useCallback(
    async (isFinal = false) => {
      if (!studentId || !examId || submittedRef.current) return;
      if (saveInProgressRef.current && !isFinal) return; // one in-flight save at a time
      const snapshot = JSON.stringify({ mcq: mcqAnswers, coding: codingAnswers });
      if (!isFinal && lastSavedSnapshotRef.current === snapshot) return; // skip if no changes
      saveInProgressRef.current = true;
      const payload = {
        student_id: studentId,
        exam_id: examId,
        mcq_answers: mcqAnswers,
        coding_answers: codingAnswers,
        total_score: computeTotalScore(),
        ...(isFinal ? { submitted_at: new Date().toISOString() } : {}),
      };
      const { error } = await supabase
        .from('submissions')
        .upsert(
          {
            ...payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,exam_id' }
        );
      saveInProgressRef.current = false;
      if (!error) lastSavedSnapshotRef.current = snapshot;
      if (error) {
        console.error('Save error:', error);
        if (isFinal) throw new Error(error.message);
      }
    },
    [studentId, examId, mcqAnswers, codingAnswers, computeTotalScore]
  );

  // Autosave with jitter (90s ± 15s) and skip when no changes / save in progress
  useEffect(() => {
    if (!entryReady || !studentId || !examId) return;
    const scheduleNext = () => {
      const jitter = (Math.random() * 2 - 1) * AUTOSAVE_JITTER_MS;
      const interval = AUTOSAVE_BASE_MS + jitter;
      autosaveTimerRef.current = setTimeout(() => {
        if (submittedRef.current) return;
        saveDraft(false);
        scheduleNext();
      }, interval);
    };
    scheduleNext();
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [entryReady, studentId, examId, saveDraft]);

  const handleExamEnd = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    const delay =
      FINAL_SUBMIT_DELAY_MS_MIN +
      Math.random() * (FINAL_SUBMIT_DELAY_MS_MAX - FINAL_SUBMIT_DELAY_MS_MIN);
    setTimeout(async () => {
      let lastErr = null;
      for (let attempt = 0; attempt <= SUBMIT_RETRY_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, SUBMIT_RETRY_DELAY_MS[attempt - 1]));
        }
        try {
          await saveDraft(true);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) console.error('Final submit failed after retries:', lastErr);
      sessionStorage.setItem(`exam_submitted_${examId}_${studentId}`, '1');
      router.push('/result');
    }, delay);
  }, [examId, studentId, saveDraft, router]);

  if (!entryReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Preparing your exam... Please wait.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Submitting... Do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Exam</h1>
        <Timer totalSeconds={totalSeconds} onEnd={handleExamEnd} />
      </div>
      <MCQSection
        questions={mcqQuestions}
        mcqAnswers={mcqAnswers}
        setMcqAnswers={setMcqAnswers}
      />
      <div className="mt-8">
        <CodingSection
          questions={codingQuestions}
          codingAnswers={codingAnswers}
          setCodingAnswers={setCodingAnswers}
          runCounts={runCounts}
          setRunCounts={setRunCounts}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleExamEnd}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          Submit exam
        </button>
      </div>
    </div>
  );
}
