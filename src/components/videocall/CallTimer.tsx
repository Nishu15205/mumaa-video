'use client'

import { useEffect, useState } from 'react'

interface CallTimerProps {
  startTime: Date
  isRunning: boolean
}

export function CallTimer({ startTime, isRunning }: CallTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isRunning) return

    const update = () => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startTime, isRunning])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  const display = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`

  return (
    <span className="font-mono text-lg tracking-wider text-white/90">
      {display}
    </span>
  )
}
