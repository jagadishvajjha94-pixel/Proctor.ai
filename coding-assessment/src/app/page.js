'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <p>Redirecting to login...</p>
      <Link href="/login" className="text-blue-600 underline">Go to login</Link>
    </div>
  );
}
