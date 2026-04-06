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
  CameraOff,
  AlertCircle,
  Camera,
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
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isAcquiringMedia, setIsAcquiringMedia] = useState(false)

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

  // Create peer connection (async because getIceServers fetches TURN config from API)
  const createPC = useCallback(async () => {
    log('Creating RTCPeerConnection...')
    const iceConfig = await getIceServers()
    const pc = new RTCPeerConnection(iceConfig)
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

  // Attach stream to local video element with retries
  const attachLocalStream = useCallback((stream: MediaStream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.play().catch((e) => {
        log(`Local video play failed: ${e.message}`)
      })
      log('Local video stream attached')
    }
  }, [])

  // Get user media — tries video first, falls back to audio-only with clear error
  const getMedia = useCallback(async (withVideo: boolean): Promise<MediaStream> => {
    log(`Requesting media (video: ${withVideo})...`)
    setIsAcquiringMedia(true)
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        withVideo ? VIDEO_CONSTRAINTS : AUDIO_ONLY_CONSTRAINTS
      )
      log(`Media obtained: ${stream.getAudioTracks().length} audio, ${stream.getVideoTracks().length} video tracks`)
      localStreamRef.current = stream
      setIsAudioEnabled(true)
      const hasVideo = stream.getVideoTracks().length > 0
      setIsVideoEnabled(hasVideo)
      if (!hasVideo && withVideo) {
        // Camera was requested but not obtained — show clear message
        setCameraError('Camera could not be started. Tap the camera button below to retry.')
      }
      attachLocalStream(stream)
      return stream
    } catch (err: any) {
      log(`Media error: ${err.name} - ${err.message}`)
      if (withVideo) {
        // Try audio-only fallback
        try {
          log('Camera failed, trying audio-only fallback...')
          const audioStream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY_CONSTRAINTS)
          localStreamRef.current = audioStream
          setIsAudioEnabled(true)
          setIsVideoEnabled(false)
          setCameraError('Camera unavailable. Tap the camera button below to enable it.')
          return audioStream
        } catch (audioErr: any) {
          log(`Audio also failed: ${audioErr.name} - ${audioErr.message}`)
          setCameraError('Camera and microphone access denied. Please check permissions and reload.')
          throw new Error('Media access denied. Please allow camera/microphone and refresh.')
        }
      }
      setCameraError(`Microphone error: ${err.name}`)
      throw err
    } finally {
      setIsAcquiringMedia(false)
    }
  }, [attachLocalStream])

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
      
      // Get media stream — use pre-acquired or request new
      let stream = localStreamRef.current
      if (!stream || stream.getTracks().length === 0) {
        log('No pre-acquired stream, requesting camera/mic...')
        stream = await getMedia(true)
      }
      localStreamRef.current = stream
      
      // Attach to local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch((e) => log(`Local video play failed: ${e.message}`))
        log('Local video attached')
      } else {
        log('WARN: localVideoRef not ready yet, will retry')
        // Retry attaching after a short delay
        const attachRetry = () => {
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
            localVideoRef.current.play().catch((e) => log(`Local video play retry failed: ${e.message}`))
            log('Local video attached (retry)')
          }
        }
        setTimeout(attachRetry, 500)
        setTimeout(attachRetry, 1000)
        setTimeout(attachRetry, 2000)
      }
      
      const pc = await createPC()
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
          let stream = localStreamRef.current
          if (!stream || stream.getTracks().length === 0) {
            stream = await getMedia(true)
          } else {
            // Verify tracks are still live
            const hasLiveTracks = stream.getTracks().some(t => t.readyState === 'live' || t.readyState === 'new')
            if (!hasLiveTracks) {
              log('WARN: Stored stream tracks dead, re-acquiring...')
              stream = await getMedia(true)
            }
          }
          localStreamRef.current = stream
          attachLocalStream(stream)
          const pc = await createPC()
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
    preStreamInitRef.current = true
    const preStream = useAppStore.getState().localStream
    if (preStream && preStream.getTracks().length > 0) {
      // Check if tracks are still active (not stopped/expired)
      const hasActiveTracks = preStream.getTracks().some(t => t.readyState === 'live' || t.readyState === 'new')
      if (!hasActiveTracks) {
        log('WARN: Pre-acquired stream tracks are dead, will re-acquire')
        return
      }
      log(`Using pre-acquired media stream: ${preStream.getTracks().filter(t=>t.kind==='audio').length} audio, ${preStream.getTracks().filter(t=>t.kind==='video').length} video (readyState: ${preStream.getTracks().map(t=>t.readyState).join(', ')})`)
      localStreamRef.current = preStream
      // Use microtask to avoid sync setState warning
      queueMicrotask(() => {
        const audioTracks = preStream.getAudioTracks()
        const videoTracks = preStream.getVideoTracks()
        setIsAudioEnabled(audioTracks.some(t => t.enabled))
        const hasVideo = videoTracks.some(t => t.enabled && (t.readyState === 'live' || t.readyState === 'new'))
        setIsVideoEnabled(hasVideo)
        // If no video in pre-acquired stream, show helpful message
        if (!hasVideo) {
          setCameraError('Camera not started. Tap the camera button or the preview to enable it.')
        }
      })
      // Attach to video element — retry since element might not be painted yet
      const attachVideo = () => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = preStream
          localVideoRef.current.play().catch((e) => log(`Pre-stream play failed: ${e.message}`))
          log('Pre-stream attached to video element')
        }
      }
      attachVideo()
      setTimeout(attachVideo, 300)
      setTimeout(attachVideo, 800)
      setTimeout(attachVideo, 1500)
    } else {
      log('No pre-acquired stream in store, will request on init')
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

  // Toggle video — smart: re-acquires camera if no video tracks exist
  const toggleVideo = async () => {
    const stream = localStreamRef.current
    const videoTracks = stream?.getVideoTracks() ?? []

    // If video tracks exist, just toggle enabled state
    if (videoTracks.length > 0) {
      const willEnable = !videoTracks.some((t) => t.enabled)
      videoTracks.forEach((t) => { t.enabled = willEnable })
      setIsVideoEnabled(willEnable)
      return
    }

    // No video tracks — try to acquire camera now
    log('No video tracks, attempting to acquire camera...')
    setIsAcquiringMedia(true)
    setCameraError(null)
    try {
      const camStream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
      const newVideoTrack = camStream.getVideoTracks()[0]
      if (!newVideoTrack) throw new Error('No video track returned')

      // Stop the temporary audio tracks from this new stream (we already have audio)
      camStream.getAudioTracks().forEach((t) => t.stop())

      // Add video track to existing stream and peer connection
      if (stream) {
        stream.addTrack(newVideoTrack)
      } else {
        localStreamRef.current = camStream
      }

      // Add to peer connection sender or create new sender
      const pc = pcRef.current
      if (pc) {
        const senders = pc.getSenders()
        const existingVideoSender = senders.find((s) => s.track?.kind === 'video')
        if (existingVideoSender) {
          await existingVideoSender.replaceTrack(newVideoTrack)
        } else {
          pc.addTrack(newVideoTrack, stream || camStream)
        }
        // Re-negotiate if connected
        if (pc.connectionState === 'connected') {
          log('Renegotiating after adding video track...')
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          if (socketRef.current?.connected) {
            socketRef.current.emit('webrtc-offer', {
              callId,
              toUserId: otherUserId,
              sdp: pc.localDescription?.toJSON(),
            })
          }
        }
      }

      setIsVideoEnabled(true)
      setCameraError(null)
      attachLocalStream(localStreamRef.current!)
      log('Camera acquired successfully via toggle!')
    } catch (err: any) {
      log(`Camera toggle failed: ${err.name} - ${err.message}`)
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in browser settings and try again.')
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError(`Could not enable camera: ${err.message}`)
      }
    } finally {
      setIsAcquiringMedia(false)
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

      {/* Camera Error Banner */}
      <AnimatePresence>
        {cameraError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-12 left-4 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-200 text-xs flex-1">{cameraError}</span>
            <button
              onClick={async () => {
                try {
                  setCameraError(null)
                  setIsAcquiringMedia(true)
                  const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
                  // Stop old tracks
                  localStreamRef.current?.getTracks().forEach(t => t.stop())
                  localStreamRef.current = stream
                  setIsVideoEnabled(true)
                  setIsAudioEnabled(true)
                  // Add new tracks to peer connection
                  const pc = pcRef.current
                  if (pc) {
                    const senders = pc.getSenders()
                    stream.getVideoTracks().forEach(track => {
                      const existingVideoSender = senders.find(s => s.track?.kind === 'video')
                      if (existingVideoSender) {
                        existingVideoSender.replaceTrack(track)
                      } else {
                        pc.addTrack(track, stream)
                      }
                    })
                    stream.getAudioTracks().forEach(track => {
                      const existingAudioSender = senders.find(s => s.track?.kind === 'audio')
                      if (existingAudioSender) {
                        existingAudioSender.replaceTrack(track)
                      } else {
                        pc.addTrack(track, stream)
                      }
                    })
                  }
                  attachLocalStream(stream)
                  log('Camera retry succeeded!')
                } catch (err: any) {
                  setCameraError(`Camera still unavailable: ${err.name}. Tap to retry.`)
                } finally {
                  setIsAcquiringMedia(false)
                }
              }}
              disabled={isAcquiringMedia}
              className="text-amber-300 text-xs font-medium hover:text-amber-100 disabled:opacity-50"
            >
              {isAcquiringMedia ? 'Retrying...' : 'Retry'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Local video (PiP) */}
      <div className="absolute bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
        <div className={cn(
          'relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20',
          'w-[120px] h-[90px] sm:w-[180px] sm:h-[135px]'
        )}>
          {isAcquiringMedia && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              'w-full h-full object-cover',
              !isVideoEnabled && !isAcquiringMedia && 'hidden'
            )}
            style={{ transform: 'scaleX(-1)' }}
          />
          {!isVideoEnabled && !isAcquiringMedia && (
            <button
              onClick={toggleVideo}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 gap-1.5 cursor-pointer hover:bg-gray-700 transition-colors"
              title="Tap to enable camera"
            >
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <Camera className="w-5 h-5 text-gray-300" />
              </div>
              <span className="text-[9px] text-gray-400 font-medium">Tap to enable</span>
            </button>
          )}
          {/* Camera label */}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm">
            <span className="text-[10px] text-white/70 font-medium">You</span>
          </div>
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
