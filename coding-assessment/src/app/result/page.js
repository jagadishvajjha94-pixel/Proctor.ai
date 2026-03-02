'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

/**
 * Result page: show last submission total score (read from Supabase).
 * No live leaderboard; no polling. Single read after load.
 */
export default function ResultPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.replace('/login');
        return;
      }
      const examId = process.env.NEXT_PUBLIC_EXAM_ID;
      if (!examId) {
        setLoading(false);
        setError('Exam not configured.');
        return;
      }
      const { data, error: e } = await supabase
        .from('submissions')
        .select('total_score, submitted_at')
        .eq('student_id', session.user.id)
        .eq('exam_id', examId)
        .maybeSingle();
      if (cancelled) return;
      if (e) setError(e.message);
      else setSubmission(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Result</h1>
        {submission ? (
          <>
            <p className="text-4xl font-bold text-blue-600 mb-2">{submission.total_score}</p>
            <p className="text-gray-600">Total score</p>
            {submission.submitted_at && (
              <p className="text-sm text-gray-500 mt-4">
                Submitted at {new Date(submission.submitted_at).toLocaleString()}
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-600">No submission found.</p>
        )}
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-6 px-4 py-2 border rounded-lg hover:bg-gray-100"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
