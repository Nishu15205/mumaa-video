'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize,
  MonitorUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { getIceServers } from '@/lib/webrtc'

interface WebRTCCallProps {
  callId: string
  otherUserId: string
  otherPersonName: string
  isCaller: boolean
  socketRef: React.MutableRefObject<any>
  onConnected: () => void
  onDisconnected: (duration: number) => void
  onError: (message: string) => void
}

const log = (...args: unknown[]) => console.log('[WebRTC]', ...args)

/** Mobile-friendly constraints */
const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: 'user',
  },
}

const AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
}

export function WebRTCCall({
  callId,
  otherUserId,
  otherPersonName,
  isCaller,
  socketRef,
  onConnected,
  onDisconnected,
  onError,
}: WebRTCCallProps) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callStartTimeRef = useRef<Date | null>(null)
  const cleanupCalledRef = useRef(false)
  const offerSentRef = useRef(false)
  /** Buffer for ICE candidates that arrive before PeerConnection is created */
  const iceBufferRef = useRef<any[]>([])

  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isRemoteVideoPresent, setIsRemoteVideoPresent] = useState(false)
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting')
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // Cleanup all resources
  const cleanup = useCallback(() => {
    if (cleanupCalledRef.current) return
    cleanupCalledRef.current = true
    log('Cleaning up resources')
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.ontrack = null
      pcRef.current.onicecandidate = null
      pcRef.current.onconnectionstatechange = null
      pcRef.current.oniceconnectionstatechange = null
      pcRef.current.close()
      pcRef.current = null
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    remoteStreamRef.current = null
    iceBufferRef.current = []
  }, [])

  // Flush buffered ICE candidates onto the peer connection
  const flushIceBuffer = useCallback(() => {
    const pc = pcRef.current
    if (!pc) return
    const buffer = iceBufferRef.current
    iceBufferRef.current = []
    buffer.forEach(async (cand) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand))
        log('Flushed buffered ICE candidate')
      } catch {
        // Ignore stale candidates
      }
    })
  }, [])

  // Handle remote track
  const handleTrack = useCallback((event: RTCTrackEvent) => {
    log('Remote track received!')
    const stream = event.streams[0]
    if (stream) {
      remoteStreamRef.current = stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
        remoteVideoRef.current.play().catch(() => {})
      }
      const videoTracks = stream.getVideoTracks()
      setIsRemoteVideoPresent(videoTracks.length > 0 && videoTracks[0].enabled)
      stream.onremovetrack = () => {
        const vt = stream.getVideoTracks()
        setIsRemoteVideoPresent(vt.length > 0 && vt[0].enabled)
      }
      stream.onaddtrack = () => {
        const vt = stream.getVideoTracks()
        setIsRemoteVideoPresent(vt.length > 0 && vt[0].enabled)
      }
    }
  }, [])

  // Send ICE candidate
  const sendICECandidate = useCallback((event: RTCPandidateEvent) => {
    if (event.candidate && socketRef.current?.connected) {
      socketRef.current.emit('webrtc-ice-candidate', {
        callId,
        toUserId: otherUserId,
        candidate: event.candidate.toJSON(),
      })
    }
  }, [callId, otherUserId, socketRef])

  // Monitor connection state with ICE restart
  const setupConnectionMonitoring = useCallback((pc: RTCPeerConnection) => {
    let iceRestartAttempted = false

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      log(`Connection state: ${state}`)
      if (state === 'connected') {
        callStartTimeRef.current = new Date()
        setCallStatus('connected')
        onConnected()
      } else if (state === 'failed') {
        if (!iceRestartAttempted) {
          iceRestartAttempted = true
          log('Connection FAILED - attempting ICE restart...')
          try {
            pc.restartIce()
            log('ICE restart initiated')
          } catch {
            log('ICE restart not supported, giving up')
            setCallStatus('failed')
            onError('Connection failed. Please try again.')
          }
        } else {
          log('Connection FAILED after ICE restart attempt')
          setCallStatus('failed')
          onError('Connection failed. Please try again.')
        }
      } else if (state === 'disconnected') {
        log('Connection disconnected - waiting for recovery...')
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            const duration = callStartTimeRef.current
              ? Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
              : 0
            if (duration > 0) {
              onDisconnected(duration)
            } else {
              setCallStatus('failed')
              onError('Connection lost. Please try again.')
            }
          }
        }, 5000)
      }
    }

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState
      log(`ICE state: ${iceState}`)
      if (iceState === 'failed') {
        if (!iceRestartAttempted) {
          iceRestartAttempted = true
          log('ICE FAILED - attempting ICE restart...')
          try {
            pc.restartIce()
            log('ICE restart initiated')
          } catch {
            log('ICE restart not supported')
            setCallStatus('failed')
            onError('Could not establish connection. Please try again.')
          }
        } else {
          log('ICE FAILED after restart attempt')
          setCallStatus('failed')
          onError('Could not establish connection. Please try again.')
        }
      } else if (iceState === 'connected' || iceState === 'completed') {
        log('ICE connection established!')
      }
    }
  }, [onConnected, onDisconnected, onError])

  // Create peer connection
  const createPC = useCallback(() => {
    log('Creating RTCPeerConnection...')
    const pc = new RTCPeerConnection(getIceServers())
    pcRef.current = pc
    pc.ontrack = handleTrack
    pc.onicecandidate = sendICECandidate
    setupConnectionMonitoring(pc)

    // Log ICE gathering state
    pc.onicegatheringstatechange = () => {
      log(`ICE gathering state: ${pc.iceGatheringState}`)
    }

    return pc
  }, [handleTrack, sendICECandidate, setupConnectionMonitoring])

  // Get user media with fallback
  const getMedia = useCallback(async (withVideo: boolean): Promise<MediaStream> => {
    log(`Requesting media (video: ${withVideo})...`)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        withVideo ? VIDEO_CONSTRAINTS : AUDIO_ONLY_CONSTRAINTS
      )
      log(`Media obtained: ${stream.getAudioTracks().length} audio, ${stream.getVideoTracks().length} video tracks`)
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch(() => {})
      }
      setIsAudioEnabled(true)
      setIsVideoEnabled(withVideo)
      return stream
    } catch (err: any) {
      log(`Media error: ${err.name} - ${err.message}`)
      if (withVideo && (err.name === 'NotAllowedError' || err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
        log('Falling back to audio-only...')
        const audioStream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY_CONSTRAINTS)
        localStreamRef.current = audioStream
        setIsAudioEnabled(true)
        setIsVideoEnabled(false)
        return audioStream
      }
      throw err
    }
  }, [])

  // Caller: initiate call — send WebRTC offer
  const initiateCall = useCallback(async () => {
    if (offerSentRef.current) return
    const socket = socketRef.current
    if (!socket?.connected) {
      log('ERROR: Socket not connected, cannot start call')
      // Wait up to 10 seconds for socket
      let waited = 0
      while (!socketRef.current?.connected && waited < 10000) {
        await new Promise(r => setTimeout(r, 500))
        waited += 500
      }
      if (!socketRef.current?.connected) {
        log('ERROR: Socket still not connected after 10s wait')
        onError('Could not connect to signaling server. Please try again.')
        return
      }
    }

    try {
      offerSentRef.current = true
      log(`Starting call as caller (callId: ${callId})`)
      const stream = localStreamRef.current || await getMedia(true)
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch(() => {})
      }
      const pc = createPC()
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      log('Creating SDP offer...')
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      await pc.setLocalDescription(offer)
      log('Local description set (offer)')

      socketRef.current.emit('webrtc-offer', {
        callId,
        toUserId: otherUserId,
        sdp: pc.localDescription?.toJSON(),
      })
      log(`Offer sent to ${otherUserId.slice(0, 8)}...`)

      // If ICE gathering already completed, we might have all candidates
      // The other side should still receive them via trickle
    } catch (err: any) {
      log(`Start call failed: ${err.message}`)
      onError(err?.message || 'Failed to start video call. Please allow camera/microphone access.')
    }
  }, [callId, otherUserId, socketRef, getMedia, createPC, onError])

  // WebRTC signaling — handle offer/answer/ICE from the other peer
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const onOffer = async (data: any) => {
      log(`Received offer from ${data.fromUserId?.slice(0, 8)}`)
      if (data.callId === callId && data.fromUserId === otherUserId) {
        try {
          log('Processing offer, creating answer...')
          const stream = localStreamRef.current || await getMedia(true)
          localStreamRef.current = stream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
            localVideoRef.current.play().catch(() => {})
          }
          const pc = createPC()
          stream.getTracks().forEach((t) => pc.addTrack(t, stream))

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          log('Remote description set (offer)')

          // Flush any buffered ICE candidates
          flushIceBuffer()

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          log('Local description set (answer)')

          if (socketRef.current?.connected) {
            socketRef.current.emit('webrtc-answer', {
              callId,
              toUserId: otherUserId,
              sdp: pc.localDescription?.toJSON(),
            })
            log('Answer sent back')
          } else {
            log('ERROR: Socket disconnected before answer could be sent')
          }
        } catch (err: any) {
          log(`Accept call failed: ${err.message}`)
          onError(err?.message || 'Failed to accept call.')
        }
      }
    }

    const onAnswer = async (data: any) => {
      log(`Received answer from ${data.fromUserId?.slice(0, 8)}`)
      if (data.callId === callId && data.fromUserId === otherUserId) {
        const pc = pcRef.current
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
            log('Remote description set (answer) — ICE negotiation starting...')
          } catch (err: any) {
            log(`Set remote description error: ${err.message}`)
          }
        } else {
          log('ERROR: No peer connection to set answer on')
        }
      }
    }

    const onICE = async (data: any) => {
      if (data.callId === callId && data.fromUserId === otherUserId && data.candidate) {
        const pc = pcRef.current
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
          } catch {
            // Ignore stale candidates
          }
        } else {
          // Buffer ICE candidates until PC is created
          log(`Buffering ICE candidate (PC not ready yet)`)
          iceBufferRef.current.push(data.candidate)
        }
      }
    }

    socket.on('webrtc-offer', onOffer)
    socket.on('webrtc-answer', onAnswer)
    socket.on('webrtc-ice-candidate', onICE)

    return () => {
      socket.off('webrtc-offer', onOffer)
      socket.off('webrtc-answer', onAnswer)
      socket.off('webrtc-ice-candidate', onICE)
    }
  }, [socketRef, callId, otherUserId, getMedia, createPC, onError, flushIceBuffer])

  const preStreamInitRef = useRef(false)

  // Initialize: use pre-acquired stream from store
  useEffect(() => {
    if (preStreamInitRef.current) return
    const preStream = useAppStore.getState().localStream
    if (preStream) {
      log('Using pre-acquired media stream from call accept')
      localStreamRef.current = preStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = preStream
        localVideoRef.current.play().catch(() => {})
      }
      preStreamInitRef.current = true
      // Use microtask to avoid sync setState warning
      queueMicrotask(() => {
        setIsAudioEnabled(preStream.getAudioTracks().some(t => t.enabled))
        setIsVideoEnabled(preStream.getVideoTracks().some(t => t.enabled))
      })
    }
  }, [])

  // Auto-start for caller, or just get media ready for callee
  useEffect(() => {
    if (isCaller) {
      const timer = setTimeout(() => {
        initiateCall()
      }, 800)
      return () => clearTimeout(timer)
    } else {
      if (!localStreamRef.current) {
        log('No pre-acquired stream, requesting media...')
        // Use setTimeout to avoid sync setState in effect
        const timer = setTimeout(() => {
          getMedia(true).then(() => {
            log('Camera & microphone ready. Waiting for caller...')
          }).catch((err) => {
            log(`Media error: ${err.message}`)
          })
        }, 100)
        return () => clearTimeout(timer)
      } else {
        log('Pre-acquired stream ready. Waiting for caller to send offer...')
      }
    }
  }, [isCaller, initiateCall, getMedia])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled })
      setIsAudioEnabled((p) => !p)
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getVideoTracks()
      if (tracks.length > 0) {
        tracks.forEach((t) => { t.enabled = !t.enabled })
        setIsVideoEnabled((p) => !p)
      }
    }
  }

  // Screen share
  const toggleScreenShare = async () => {
    try {
      const pc = pcRef.current
      if (!pc) return

      if (isScreenSharing) {
        const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && stream.getVideoTracks()[0]) {
          await sender.replaceTrack(stream.getVideoTracks()[0])
        }
        setIsScreenSharing(false)
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && screenTrack) {
          await sender.replaceTrack(screenTrack)
        }
        screenTrack.onended = async () => {
          const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
          const newVideoTrack = stream.getVideoTracks()[0]
          const sender2 = pc.getSenders().find((s) => s.track?.kind === 'video')
          if (sender2 && newVideoTrack) await sender2.replaceTrack(newVideoTrack)
          setIsScreenSharing(false)
        }
        setIsScreenSharing(true)
      }
    } catch {
      // User cancelled screen share picker
    }
  }

  // End call
  const endCall = useCallback(() => {
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
      : 0
    cleanup()
    onDisconnected(duration)
  }, [cleanup, onDisconnected])

  return (
    <div className="absolute inset-0 z-10 bg-gray-950" data-webrtc-container>
      {/* Remote video (full screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          !isRemoteVideoPresent && 'hidden'
        )}
      />

      {/* Remote placeholder */}
      {!isRemoteVideoPresent && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-center"
          >
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold text-white">{getInitials(otherPersonName)}</span>
            </div>
            <p className="text-white/80 text-lg font-medium">{otherPersonName}</p>
            {callStatus === 'connecting' && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-white/40 text-sm">
                  {isCaller ? `Connecting to ${otherPersonName}...` : `Waiting for ${otherPersonName} to connect...`}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Local video (PiP) */}
      <div className="absolute bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
        <div className={cn(
          'relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20',
          'w-[120px] h-[90px] sm:w-[180px] sm:h-[135px]'
        )}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              'w-full h-full object-cover',
              !isVideoEnabled && 'hidden'
            )}
            style={{ transform: 'scaleX(-1)' }}
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white text-sm font-bold">You</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center pb-5 sm:pb-6 pt-10 sm:pt-12 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleAudio}
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors',
              isAudioEnabled
                ? 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
                : 'bg-red-500 text-white'
            )}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleVideo}
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors',
              isVideoEnabled
                ? 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
                : 'bg-red-500 text-white'
            )}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={endCall}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
          >
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleScreenShare}
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors hidden sm:flex',
              isScreenSharing
                ? 'bg-emerald-500 text-white'
                : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
            )}
          >
            <MonitorUp className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {})
              } else {
                document.exitFullscreen()
              }
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <Maximize className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Connecting indicator */}
      <AnimatePresence>
        {callStatus === 'connecting' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pt-3 bg-gradient-to-b from-black/60 to-transparent"
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white text-xs font-medium">Connecting...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected indicator */}
      <AnimatePresence>
        {callStatus === 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center py-3 bg-gradient-to-b from-black/50 to-transparent"
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-300 text-xs font-medium">Connected</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
