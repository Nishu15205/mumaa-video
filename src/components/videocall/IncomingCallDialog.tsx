'use client'

import { useEffect, useState, useCallback } from 'react'
import { PhoneOff, Phone, Video, Volume2, Loader2 } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { apiPut } from '@/lib/api'
import { toast } from 'sonner'
import { startRingtone, stopRingtone } from '@/lib/ringtone'
import type { IncomingCall } from '@/types'

interface IncomingCallDialogProps {
  call: IncomingCall | null
}

/** Mobile-friendly media constraints */
const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: 'user',
  },
}

const AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
}

async function acquireMedia(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS)
    console.log('[IncomingCall] Media acquired: video+audio')
    return stream
  } catch (videoErr: any) {
    console.warn('[IncomingCall] Video failed, trying audio only:', videoErr.name)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY_CONSTRAINTS)
      console.log('[IncomingCall] Media acquired: audio only')
      return stream
    } catch (audioErr: any) {
      console.error('[IncomingCall] Media failed completely:', audioErr)
      throw new Error('Camera/Microphone permission denied. Please allow access and try again.')
    }
  }
}

export function IncomingCallDialog({ call }: IncomingCallDialogProps) {
  const { startCall, setIncomingCall, currentCall, socket, setWaitingForNanny, setLocalStream } = useAppStore()
  const { user } = useAuthStore()
  const [timeLeft, setTimeLeft] = useState(30)
  const [accepting, setAccepting] = useState(false)

  const emitSocket = useCallback((event: string, data: any) => {
    if (socket?.connected) {
      socket.emit(event, data)
    }
  }, [socket])

  const handleAccept = useCallback(async () => {
    if (!call || !user || accepting) return

    stopRingtone()
    setAccepting(true)

    // End any previous call before starting new one
    const store = useAppStore.getState()
    if (store.currentCall) {
      store.endCall()
    }

    // CRITICAL: Request camera/mic RIGHT HERE during user gesture (Accept button tap)
    let mediaStream: MediaStream | null = null
    try {
      mediaStream = await acquireMedia()
    } catch (err: any) {
      toast.error('Media Access Denied', { description: err.message })
      setAccepting(false)
      startRingtone()
      return
    }

    try {
      await apiPut(`/api/calls/${call.callId}/status`, { status: 'ACCEPTED' })
    } catch {
      // Non-critical
    }

    // Notify caller via socket
    emitSocket('call-accepted', {
      callId: call.callId,
      toUserId: call.callerId,
      roomName: call.callRoomId || null,
    })

    const roomName = call.callRoomId || `mumaa-${call.callId}`

    const session: import('@/types').CallSession = {
      id: call.callId,
      parentId: user.role === 'PARENT' ? user.id : call.callerId,
      nannyId: user.role === 'NANNY' ? user.id : call.callerId,
      parentName: user.role === 'PARENT' ? user.name : call.callerName,
      nannyName: user.role === 'NANNY' ? user.name : call.callerName,
      parentAvatar: user.role === 'PARENT' ? (user.avatar || null) : call.callerAvatar,
      nannyAvatar: user.role === 'NANNY' ? (user.avatar || null) : call.callerAvatar,
      type: call.type,
      status: 'ACCEPTED',
      scheduledAt: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      duration: 0,
      price: 0,
      notes: null,
      callRoomId: roomName,
      rating: null,
      reviewComment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Store pre-acquired stream and start call
    setLocalStream(mediaStream)
    setWaitingForNanny(false)
    startCall(session, mediaStream)
    setIncomingCall(null)

    // call-joined is emitted by VideoCallScreen after socket is confirmed ready
  }, [call, user, startCall, setIncomingCall, accepting, emitSocket, setWaitingForNanny, setLocalStream])

  const handleDecline = useCallback(async () => {
    if (!call) return

    stopRingtone()

    try {
      await apiPut(`/api/calls/${call.callId}/status`, { status: 'CANCELLED' })
    } catch {
      // Non-critical
    }

    emitSocket('call-rejected', {
      callId: call.callId,
      toUserId: call.callerId,
    })

    setIncomingCall(null)
    toast.info('Call declined')
  }, [call, setIncomingCall, emitSocket])

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!call) {
      stopRingtone()
      return
    }

    startRingtone()
    let remaining = 30

    const timer = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(timer)
        stopRingtone()

        if (call.callId && call.callerId) {
          apiPut(`/api/calls/${call.callId}/status`, { status: 'CANCELLED' }).catch(() => {})
          emitSocket('call-rejected', { callId: call.callId, toUserId: call.callerId })
        }

        setIncomingCall(null)
        return
      }
      setTimeLeft(remaining)
    }, 1000)

    return () => {
      clearInterval(timer)
      stopRingtone()
    }
  }, [call, setIncomingCall, emitSocket])

  // Don't render if there's no incoming call
  if (!call) return null

  const initials = call.callerName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const callerRole = user?.role === 'NANNY' ? 'Parent' : 'Nanny'

  return (
    /* Full-screen overlay — NO AnimatePresence, NO initial opacity:0 animation */
    <div
      key={`incoming-${call.callId}`}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      {/* Pulsing rings (pure CSS, no Framer Motion) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-40 h-40 rounded-full border-2 border-rose-400/30 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-40 h-40 rounded-full border-2 border-rose-400/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
        <div className="absolute w-40 h-40 rounded-full border-2 border-rose-400/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
      </div>

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 rounded-3xl bg-white p-8 shadow-2xl mx-4 min-w-[280px] max-w-[340px]">
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">{initials}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-white">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">{call.callerName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{callerRole}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-600 font-medium">Incoming Video Call</span>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <p className="text-xs text-gray-400">
            Auto-declines in {timeLeft}s
          </p>
        </div>

        {/* Actions — large touch targets */}
        <div className="flex items-center gap-8">
          <button
            onClick={handleDecline}
            className="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-[72px] h-[72px] rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-colors disabled:opacity-60"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {accepting ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : (
              <Phone className="w-7 h-7 text-white" />
            )}
          </button>
        </div>

        <p className="text-[11px] text-gray-400">
          <span className="text-red-400">Decline</span>
          <span className="mx-3">·</span>
          <span className="text-emerald-500">{accepting ? 'Connecting...' : 'Accept'}</span>
        </p>
      </div>
    </div>
  )
}
