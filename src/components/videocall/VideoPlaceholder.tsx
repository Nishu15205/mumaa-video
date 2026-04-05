'use client'

import { motion } from 'framer-motion'
import { VideoOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoPlaceholderProps {
  name: string
  size: 'full' | 'small'
  showMuted?: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function VideoPlaceholder({ name, size, showMuted = false }: VideoPlaceholderProps) {
  const initials = getInitials(name)
  const hash = hashName(name)

  // Generate consistent gradient based on name
  const gradients = [
    'from-rose-500/40 to-purple-500/40',
    'from-emerald-500/40 to-teal-500/40',
    'from-amber-500/40 to-orange-500/40',
    'from-fuchsia-500/40 to-pink-500/40',
    'from-cyan-500/40 to-emerald-500/40',
    'from-rose-500/40 to-amber-500/40',
  ]
  const gradient = gradients[hash % gradients.length]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden',
        'bg-gradient-to-br',
        gradient,
        'bg-gray-900/80',
        size === 'full' ? 'w-full h-full' : 'w-40 h-28 rounded-2xl'
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className={cn(
          'flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm',
          size === 'full' ? 'w-28 h-28' : 'w-14 h-14'
        )}
      >
        <span
          className={cn(
            'font-bold text-white tracking-wide',
            size === 'full' ? 'text-4xl' : 'text-lg'
          )}
        >
          {initials}
        </span>
      </motion.div>

      {size === 'full' && (
        <p className="mt-4 text-sm font-medium text-white/80">{name}</p>
      )}

      {showMuted && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1">
          <VideoOff className="w-3 h-3 text-white/70" />
          <span className="text-[10px] text-white/70">Camera off</span>
        </div>
      )}
    </motion.div>
  )
}
