'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MUMAA] Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 p-8 text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
          <p className="text-gray-500 text-sm">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button
            onClick={reset}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11 px-6"
          >
            Try Again
          </Button>
        </div>
      </body>
    </html>
  );
}
