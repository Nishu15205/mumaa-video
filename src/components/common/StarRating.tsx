'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }

  const iconSize = sizeMap[size]

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value
        const hovered = star <= hoverValue

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={cn(
              'transition-colors duration-100',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            onClick={() => {
              if (!readonly && onChange) {
                onChange(star === value ? 0 : star)
              }
            }}
          >
            <Star
              className={cn(
                iconSize,
                'transition-colors duration-150',
                (filled || hovered) && !readonly
                  ? 'fill-amber-400 text-amber-400'
                  : filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-gray-300'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
