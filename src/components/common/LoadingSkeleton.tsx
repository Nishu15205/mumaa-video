'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface LoadingSkeletonProps {
  variant: 'card' | 'table' | 'profile' | 'list'
}

export function LoadingSkeleton({ variant }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="border-b bg-gray-50 px-4 py-3 flex gap-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b px-4 py-3 flex gap-6 items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'profile') {
    return (
      <div className="rounded-xl border bg-white p-6 space-y-5">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="text-center space-y-2">
            <Skeleton className="h-5 w-36 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1 p-3 rounded-lg bg-gray-50">
              <Skeleton className="h-5 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // variant === 'list'
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border bg-white p-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}
