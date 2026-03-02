/**
 * Judge0 API client – frontend calls directly (no backend proxy).
 * Limit: 20 runs per question enforced in component.
 *
 * Auth formats (set in env):
 * - RapidAPI: NEXT_PUBLIC_JUDGE0_AUTH=rapidapi (default)
 *   Uses X-RapidAPI-Key and X-RapidAPI-Host. Set BASE_URL, API_KEY, and optionally HOST.
 * - Official / self-hosted: NEXT_PUBLIC_JUDGE0_AUTH=token
 *   Uses X-Auth-Token or Authorization: Bearer <key>. Set BASE_URL and API_KEY.
 */
const JUDGE0_BASE = process.env.NEXT_PUBLIC_JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_KEY = process.env.NEXT_PUBLIC_JUDGE0_API_KEY || '';
const JUDGE0_HOST = process.env.NEXT_PUBLIC_JUDGE0_HOST || (typeof JUDGE0_BASE === 'string' ? new URL(JUDGE0_BASE).host : '');
const JUDGE0_AUTH = process.env.NEXT_PUBLIC_JUDGE0_AUTH || 'rapidapi';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (JUDGE0_AUTH === 'token') {
    if (JUDGE0_KEY) headers['X-Auth-Token'] = JUDGE0_KEY;
    // Alternative: headers['Authorization'] = `Bearer ${JUDGE0_KEY}`;
  } else {
    if (JUDGE0_KEY) headers['X-RapidAPI-Key'] = JUDGE0_KEY;
    if (JUDGE0_HOST) headers['X-RapidAPI-Host'] = JUDGE0_HOST;
  }
  return headers;
}

const LANGUAGE_IDS = {
  python: 71,
  cpp: 54,
  java: 62,
  javascript: 63,
};

/**
 * Submit source code for execution; returns token for status polling.
 */
export async function createSubmission({ sourceCode, language, stdin = '' }) {
  const langId = LANGUAGE_IDS[language] ?? LANGUAGE_IDS.python;
  const res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: langId,
      stdin: stdin || undefined,
      expected_output: undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Judge0 submit failed: ${err}`);
  }
  return res.json();
}

/**
 * Run code and return stdout/stderr (wait=true so one request).
 * Compare output with expected (trim whitespace) in caller for scoring.
 */
export async function runCode({ sourceCode, language, stdin = '', expectedOutput = '' }) {
  const langId = LANGUAGE_IDS[language] ?? LANGUAGE_IDS.python;
  const body = {
    source_code: sourceCode,
    language_id: langId,
    stdin: stdin || undefined,
  };
  if (expectedOutput !== undefined && expectedOutput !== '') {
    body.expected_output = expectedOutput;
  }
  const res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Judge0 run failed: ${err}`);
  }
  const data = await res.json();
  return {
    stdout: data.stdout || '',
    stderr: data.stderr || '',
    compile_output: data.compile_output || '',
    status: data.status,
    exitCode: data.exit_code,
  };
}

/**
 * Compare actual output with expected (trim both sides).
 */
export function compareOutput(actual, expected) {
  const a = (actual || '').trim();
  const b = (expected || '').trim();
  return a === b;
}

export { LANGUAGE_IDS };
