'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PhoneOff,
  ArrowLeft,
  Clock,
  X,
  Loader2,
  WifiOff,
  Video,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { CallTimer } from './CallTimer'
import { StarRating } from '@/components/common/StarRating'
import { WebRTCCall } from './WebRTCCall'

type CallState = 'waiting' | 'connecting' | 'active' | 'ended' | 'failed'

const WAIT_TIMEOUT_SECONDS = 5 * 60
const CONNECTION_TIMEOUT_SECONDS = 60

export function VideoCallScreen() {
  const { currentCall, endCall, waitingForNanny, setWaitingForNanny, socket } = useAppStore()
  const { user } = useAuthStore()

  const isCaller = user?.role === 'PARENT'
  const shouldWait = isCaller && waitingForNanny

  const [callState, setCallState] = useState<CallState>(() =>
    shouldWait ? 'waiting' : 'connecting'
  )
  const [callStartTime, setCallStartTime] = useState<Date | null>(null)
  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)
  const [otherPersonName, setOtherPersonName] = useState('')
  const [otherPersonId, setOtherPersonId] = useState('')
  const [callDurationOnEnd, setCallDurationOnEnd] = useState(0)
  const [waitSecondsLeft, setWaitSecondsLeft] = useState(WAIT_TIMEOUT_SECONDS)
  const [socketReady, setSocketReady] = useState(() => !!socket?.connected)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectingSeconds, setConnectingSeconds] = useState(0)
  /** Increment on retry to force WebRTCCall re-mount with fresh state */
  const [webrtcEpoch, setWebrtcEpoch] = useState(0)

  const socketRef = useRef<any>(null)
  const connectingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Keep socketRef in sync with the store socket (ONE socket, no creation) ───
  // If no socket exists, create a new one from runtime config
  useEffect(() => {
    if (socket) {
      socketRef.current = socket
      setSocketReady(!!socket.connected)
    } else {
      // No socket in store — create a fresh one
      ;(async () => {
        try {
          const { io } = await import('socket.io-client')
          if (!mountedRef.current) return

          // Fetch runtime config for socket URL
          let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || ''
          if (!socketUrl) {
            try {
              const cfg = await fetch('/api/config')
              if (cfg.ok) {
                const data = await cfg.json()
                socketUrl = data.socketUrl || ''
              }
            } catch { /* fallback */ }
          }

          const newSocket = io(socketUrl, {
            path: '/socket.io',
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 1000,
            timeout: 20000,
            // Route to socket-service via gateway when no explicit socketUrl
            ...(socketUrl ? {} : { query: { XTransformPort: '3003' } }),
          })

          newSocket.on('connect', () => {
            // Re-authenticate
            const currentUser = useAuthStore.getState().user
            if (currentUser?.id && currentUser?.role) {
              newSocket.emit('auth', { userId: currentUser.id, role: currentUser.role })
            }
            if (mountedRef.current) setSocketReady(true)
          })
          newSocket.on('disconnect', () => {
            if (mountedRef.current) setSocketReady(false)
          })

          socketRef.current = newSocket
          useAppStore.getState().setSocket(newSocket)
        } catch {
          // Socket creation failed
        }
      })()
    }
  }, [socket])

  // ─── Monitor socket connection state (reactive, no interference) ───
  useEffect(() => {
    const s = socketRef.current
    if (!s) return
    const onConnect = () => {
      if (mountedRef.current) setSocketReady(true)
    }
    const onDisconnect = () => {
      if (mountedRef.current) setSocketReady(false)
    }
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    setSocketReady(!!s.connected)
    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [socket])

  // ─── Nanny emits call-joined when socket is confirmed ready ───
  // This tells the parent "I'm connected and ready for WebRTC"
  useEffect(() => {
    if (isCaller) return // Only nanny emits call-joined
    if (callState !== 'connecting') return
    if (!socketReady || !currentCall) return

    const s = socketRef.current
    if (!s?.connected) return

    const parentId = currentCall.parentId
    if (!parentId) return

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    // Small delay to ensure call-accepted was already processed by parent
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        s.emit('call-joined', {
          callId: currentCall.id,
          toUserId: parentId,
        })
        console.log('[VideoCallScreen] Nanny emitted call-joined (socket ready)')
      }
    }, 500)

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [isCaller, callState, socketReady, currentCall])

  // Re-emit call-joined if socket reconnects while in connecting state
  useEffect(() => {
    if (isCaller) return
    if (callState !== 'connecting') return
    if (!currentCall) return

    const s = socketRef.current
    if (!s) return

    const onConnectHandler = () => {
      // Socket reconnected while we're in connecting state — re-emit call-joined
      const parentId = currentCall.parentId
      if (parentId) {
        setTimeout(() => {
          if (s.connected && mountedRef.current) {
            s.emit('call-joined', {
              callId: currentCall.id,
              toUserId: parentId,
            })
            console.log('[VideoCallScreen] Nanny re-emitted call-joined after socket reconnect')
          }
        }, 500)
      }
    }

    // Register this handler on the socket to catch reconnections
    s.on('connect', onConnectHandler)
    return () => {
      s.off('connect', onConnectHandler)
    }
  }, [isCaller, callState, currentCall])

  // Determine other participant info
  useEffect(() => {
    if (!currentCall || !user) return
    if (user.role === 'PARENT') {
      setOtherPersonName(currentCall.nannyName || 'Nanny')
      setOtherPersonId(currentCall.nannyId)
    } else {
      setOtherPersonName(currentCall.parentName || 'Parent')
      setOtherPersonId(currentCall.parentId)
    }
  }, [currentCall, user])

  // 5-minute countdown for waiting (parent only)
  useEffect(() => {
    if (callState !== 'waiting') return
    const interval = setInterval(() => {
      setWaitSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleCancelWait()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [callState])

  // Connection timeout — if stuck in 'connecting' for too long, show error
  useEffect(() => {
    if (callState !== 'connecting') {
      setConnectingSeconds(0)
      if (connectingTimerRef.current) {
        clearInterval(connectingTimerRef.current)
        connectingTimerRef.current = null
      }
      return
    }

    setConnectingSeconds(0)
    connectingTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return
      setConnectingSeconds((prev) => {
        const next = prev + 1
        if (next >= CONNECTION_TIMEOUT_SECONDS) {
          setConnectionError('Connection timed out. The other person may not be online or there may be a network issue.')
          setCallState('failed')
          if (connectingTimerRef.current) clearInterval(connectingTimerRef.current)
          return next
        }
        return next
      })
    }, 1000)

    return () => {
      if (connectingTimerRef.current) {
        clearInterval(connectingTimerRef.current)
        connectingTimerRef.current = null
      }
    }
  }, [callState])

  // Poll for nanny readiness (parent only)
  useEffect(() => {
    if (callState !== 'waiting') return
    const interval = setInterval(() => {
      const store = useAppStore.getState()
      if (!store.waitingForNanny && store.currentCall) {
        setWaitingForNanny(false)
        setCallState('connecting')
      }
    }, 300)
    return () => clearInterval(interval)
  }, [callState, setWaitingForNanny])

  const handleCancelWait = useCallback(() => {
    if (currentCall) {
      fetch(`/api/calls/${currentCall.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      }).catch(() => {})
    }
    setWaitingForNanny(false)
    endCall()
    toast.info('Call cancelled')
  }, [currentCall, endCall, setWaitingForNanny])

  const handleConnected = useCallback(() => {
    setCallState('active')
    setCallStartTime(new Date())
    setConnectionError(null)
    toast.success('Connected')
  }, [])

  const handleDisconnected = useCallback((duration: number) => {
    setCallDurationOnEnd(duration)
    setCallState('ended')
    if (currentCall) {
      persistCallEnd(currentCall.id, duration)
    }
  }, [currentCall])

  const handleError = useCallback((message: string) => {
    toast.error('Call Error', { description: message })
    setConnectionError(message)
    setCallState('failed')
  }, [])

  const persistCallEnd = useCallback(async (callId: string, durationSeconds: number) => {
    try {
      await fetch(`/api/calls/${callId}/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: durationSeconds }),
      })
    } catch (error) {
      console.error('Failed to persist call end:', error)
    }
  }, [])

  const handleEndCall = useCallback(() => {
    if (callStartTime) {
      const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000)
      persistCallEnd(currentCall?.id || '', duration)
      setCallDurationOnEnd(duration)
    }
    setCallState('ended')
  }, [callStartTime, currentCall, persistCallEnd])

  const handleRetryConnection = useCallback(() => {
    setConnectionError(null)
    setCallState('connecting')
    setConnectingSeconds(0)
    setWebrtcEpoch((e) => e + 1) // Force WebRTCCall re-mount
  }, [])

  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const handleSubmitReview = useCallback(async () => {
    if (!rating || !currentCall || !user || reviewSubmitted) return
    setIsReviewSubmitting(true)
    try {
      const response = await fetch(`/api/calls/${currentCall.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: otherPersonId,
          rating,
          comment: reviewComment || null,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Review Submitted!')
        setRating(0)
        setReviewComment('')
        setReviewSubmitted(true)
      } else {
        toast.error(data.error || 'Failed to submit review')
      }
    } catch (err: any) {
      console.error('[Review] Submit error:', err)
      toast.error('Network error. Please try again.')
    } finally {
      setIsReviewSubmitting(false)
    }
  }, [rating, currentCall, user, otherPersonId, reviewComment, reviewSubmitted])

  const handleBackToDashboard = useCallback(() => {
    endCall()
    setCallState('waiting')
    setRating(0)
    setReviewComment('')
    setCallStartTime(null)
    setCallDurationOnEnd(0)
    setWaitSecondsLeft(WAIT_TIMEOUT_SECONDS)
    setWaitingForNanny(false)
    setConnectionError(null)
    setConnectingSeconds(0)
  }, [endCall, setWaitingForNanny])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (connectingTimerRef.current) {
        clearInterval(connectingTimerRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  if (!currentCall) return null

  const endedMinutes = Math.floor(callDurationOnEnd / 60)
  const endedSeconds = callDurationOnEnd % 60
  const waitMinutes = Math.floor(waitSecondsLeft / 60)
  const waitSecs = waitSecondsLeft % 60

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // WebRTC is ready when: state is connecting/active, other person known, socket connected, no error
  const isWebRTCReady = (callState === 'connecting' || callState === 'active') && !!otherPersonId && socketReady && !connectionError

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-gray-950 flex flex-col"
    >
      {/* ============================================================
          WAITING STATE — PARENT ONLY
          ============================================================ */}
      <AnimatePresence>
        {callState === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950 p-4"
          >
            <div className="text-center">
              <motion.div
                className="relative inline-block mb-6"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto">
                  <span className="text-3xl font-bold text-white">{getInitials(otherPersonName)}</span>
                </div>
                <span className="absolute inset-0 rounded-full border-4 border-emerald-400/30 animate-ping" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-1">{otherPersonName}</h2>
              <p className="text-gray-400 text-sm mb-6">Waiting for nanny to join...</p>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm mb-8">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-lg font-mono text-white font-medium">
                  {String(waitMinutes).padStart(2, '0')}:{String(waitSecs).padStart(2, '0')}
                </span>
              </div>
              <div>
                <Button
                  onClick={handleCancelWait}
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300 rounded-full px-8 h-11 text-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          CONNECTING STATE — Socket not ready yet
          Shows a gentle "waiting for connection" message
          Does NOT create a new socket — lets Socket.IO reconnect
          ============================================================ */}
      <AnimatePresence>
        {callState === 'connecting' && !socketReady && (
          <motion.div
            key="socket-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950 p-4"
          >
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <WifiOff className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connecting to server</h2>
              <p className="text-gray-400 text-sm mb-6">
                Establishing secure connection. Please wait...
              </p>
              <div className="flex items-center justify-center gap-2 mb-8">
                <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
                <span className="text-sm text-gray-500">Reconnecting...</span>
              </div>
              <Button
                onClick={handleBackToDashboard}
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-full px-8 h-11 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          FAILED STATE — Connection error or timeout
          ============================================================ */}
      <AnimatePresence>
        {callState === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950 p-4"
          >
            <div className="w-full max-w-md bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
              <p className="text-gray-400 text-sm mb-2">{otherPersonName}</p>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                {connectionError || 'Could not establish video connection. Please make sure both users are online and try again.'}
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleRetryConnection}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11 font-medium"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={handleBackToDashboard}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl h-11 font-medium"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          CONNECTING & ACTIVE — Native WebRTC Video
          ============================================================ */}
      {isWebRTCReady && (
        <WebRTCCall
          key={`webrtc-${currentCall.id}-${webrtcEpoch}`}
          callId={currentCall.id}
          otherUserId={otherPersonId}
          otherPersonName={otherPersonName}
          isCaller={isCaller}
          socketRef={socketRef}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
          onError={handleError}
        />
      )}

      {/* Active call — Call timer overlay */}
      <AnimatePresence>
        {callState === 'active' && callStartTime && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center px-4 py-3 bg-gradient-to-b from-black/30 to-transparent pointer-events-none"
          >
            <CallTimer startTime={callStartTime} isRunning={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          ENDED — Call summary + review
          ============================================================ */}
      <AnimatePresence>
        {callState === 'ended' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <PhoneOff className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Call Ended</h2>
                <p className="text-gray-400 text-sm">{otherPersonName}</p>
                {callDurationOnEnd > 0 && (
                  <div className="mt-2 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gray-800">
                    <span className="text-sm text-gray-300 font-mono">
                      {String(endedMinutes).padStart(2, '0')}:{String(endedSeconds).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 mb-5" />

              <div className="text-center mb-4">
                <p className="text-sm text-gray-400 mb-3">Rate this call</p>
                <div className="flex justify-center">
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>
              </div>

              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm resize-none h-20 rounded-xl focus:ring-rose-500/30 focus:border-rose-500/50 mb-4"
              />

              <Button
                onClick={handleSubmitReview}
                disabled={!rating || isReviewSubmitting || reviewSubmitted}
                className={cn(
                  "w-full rounded-xl h-11 font-medium mb-3 transition-colors",
                  reviewSubmitted
                    ? "bg-emerald-500 text-white cursor-default"
                    : "bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-40"
                )}
              >
                {reviewSubmitted ? '✓ Review Submitted' : isReviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>

              <Button
                onClick={handleBackToDashboard}
                variant="outline"
                className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl h-11 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
