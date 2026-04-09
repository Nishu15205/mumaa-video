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
import { getIceServers, waitForIceGathering, getRelayOnlyIceConfig, logIceCandidateTypes } from '@/lib/webrtc'

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

/** Minimal constraints — used as fallback when strict constraints fail */
const VIDEO_CONSTRAINTS_MINIMAL: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: true,
}

const AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
}

/**
 * Robustly acquire camera with multiple fallback strategies:
 * 1. Try strict constraints (resolution, frameRate, facingMode)
 * 2. Try minimal constraints (video: true, no extras)
 * 3. Try every camera device one by one
 * Returns the stream if successful, throws descriptive error if all fail.
 */
async function robustGetCamera(): Promise<MediaStream> {
  // Strategy 1: Strict constraints
  try {
    log('Camera strategy 1: strict constraints')
    const s = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
    if (s.getVideoTracks().length > 0) return s
    s.getTracks().forEach(t => t.stop())
  } catch (e) {
    log(`Strategy 1 failed: ${(e as Error).name}`)
  }

  // Strategy 2: Minimal constraints (no resolution/framerate limits)
  try {
    log('Camera strategy 2: minimal constraints')
    const s = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS_MINIMAL)
    if (s.getVideoTracks().length > 0) return s
    s.getTracks().forEach(t => t.stop())
  } catch (e) {
    log(`Strategy 2 failed: ${(e as Error).name}`)
  }

  // Strategy 3: Enumerate cameras and try each one by deviceId
  try {
    log('Camera strategy 3: enumerate devices')
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    log(`Found ${videoDevices.length} video device(s)`)

    for (const device of videoDevices) {
      try {
        log(`Trying device: ${device.label || device.deviceId.slice(0, 8)}`)
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: device.deviceId } },
        })
        if (s.getVideoTracks().length > 0) {
          log(`Camera acquired from device: ${device.label || device.deviceId.slice(0, 8)}`)
          return s
        }
        s.getTracks().forEach(t => t.stop())
      } catch {
        log(`Device ${device.label || device.deviceId.slice(0, 8)} failed, trying next...`)
      }
    }
  } catch (e) {
    log(`Strategy 3 failed: ${(e as Error).name}`)
  }

  // All strategies failed
  const err = new Error('Camera not available')
  ;(err as any).code = 'CAMERA_UNAVAILABLE'
  throw err
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
  /** Debounce timer to prevent camera retry spam */
  const cameraRetryTimerRef = useRef<NodeJS.Timeout | null>(null)
  /** Track if relay-only fallback has been attempted (persists across PC recreations) */
  const relayFallbackAttemptedRef = useRef(false)

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

  // Monitor connection state with ICE restart + relay-only fallback
  // Uses refs for flags to avoid stale closures
  const setupConnectionMonitoring = useCallback((pc: RTCPeerConnection) => {
    let iceRestartAttempted = false

    const handleFailure = async () => {
      if (cleanupCalledRef.current) return

      if (!iceRestartAttempted) {
        iceRestartAttempted = true
        log('Connection FAILED - attempting ICE restart...')
        try {
          pc.restartIce()
          log('ICE restart initiated')
        } catch {
          log('ICE restart not supported, trying relay-only fallback...')
          if (!relayFallbackAttemptedRef.current) {
            relayFallbackAttemptedRef.current = true
            await tryRelayFallback()
          } else {
            setCallStatus('failed')
            onError('Connection failed. Please try again.')
          }
        }
      } else if (!relayFallbackAttemptedRef.current) {
        log('ICE restart did not help - trying relay-only fallback...')
        relayFallbackAttemptedRef.current = true
        await tryRelayFallback()
      } else {
        log('Connection FAILED after ICE restart + relay fallback')
        setCallStatus('failed')
        onError('Connection failed. Check your network and try again.')
      }
    }

    // Relay-only fallback: creates a new peer connection forced through TURN relay
    const tryRelayFallback = async () => {
      try {
        log('Creating relay-only peer connection as fallback...')
        const relayConfig = await getRelayOnlyIceConfig()
        const oldPc = pcRef.current
        const stream = localStreamRef.current

        // Close old peer connection
        if (oldPc) {
          oldPc.ontrack = null
          oldPc.onicecandidate = null
          oldPc.onconnectionstatechange = null
          oldPc.oniceconnectionstatechange = null
          oldPc.close()
        }

        const newPc = new RTCPeerConnection(relayConfig)
        pcRef.current = newPc
        newPc.ontrack = handleTrack
        newPc.onicecandidate = sendICECandidate

        // Log ICE gathering state
        newPc.onicegatheringstatechange = () => {
          log(`Relay ICE gathering state: ${newPc.iceGatheringState}`)
        }

        if (stream) {
          stream.getTracks().forEach((t) => newPc.addTrack(t, stream))
        }

        // Setup monitoring on new PC — reset ICE restart flag since it's a new connection
        let newIceRestarted = false
        newPc.onconnectionstatechange = () => {
          const state = newPc.connectionState
          log(`Relay connection state: ${state}`)
          if (state === 'connected') {
            callStartTimeRef.current = new Date()
            setCallStatus('connected')
            onConnected()
          } else if (state === 'failed') {
            if (!newIceRestarted) {
              newIceRestarted = true
              try { newPc.restartIce() } catch { /* give up */ }
            } else {
              setCallStatus('failed')
              onError('Connection failed even with relay. Please check your network.')
            }
          } else if (state === 'disconnected') {
            setTimeout(() => {
              if (newPc.connectionState === 'disconnected') {
                const duration = callStartTimeRef.current
                  ? Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
                  : 0
                if (duration > 0) onDisconnected(duration)
                else {
                  setCallStatus('failed')
                  onError('Connection lost. Please try again.')
                }
              }
            }, 5000)
          }
        }
        newPc.oniceconnectionstatechange = () => {
          const iceState = newPc.iceConnectionState
          log(`Relay ICE state: ${iceState}`)
          if (iceState === 'failed') {
            if (!newIceRestarted) {
              newIceRestarted = true
              try { newPc.restartIce() } catch { /* give up */ }
            } else {
              setCallStatus('failed')
              onError('Connection failed even with relay. Please check your network.')
            }
          } else if (iceState === 'connected' || iceState === 'completed') {
            log('Relay ICE connection established!')
          }
        }

        if (isCaller) {
          const offer = await newPc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          await newPc.setLocalDescription(offer)
          log('Relay: Waiting for ICE gathering...')
          const completeOffer = await waitForIceGathering(newPc, 5000)
          if (socketRef.current?.connected) {
            socketRef.current.emit('webrtc-offer', {
              callId,
              toUserId: otherUserId,
              sdp: completeOffer.toJSON(),
            })
            log('Relay: Offer sent (relay-only)')
          }
        }
        // For callee, the offer handler will use the new PC when next offer arrives
      } catch (err) {
        log('Relay fallback failed:', err)
        setCallStatus('failed')
        onError('Connection failed. Please try again.')
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      log(`Connection state: ${state}`)
      if (state === 'connected') {
        callStartTimeRef.current = new Date()
        setCallStatus('connected')
        onConnected()
      } else if (state === 'failed') {
        handleFailure()
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
              handleFailure()
            }
          }
        }, 5000)
      }
    }

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState
      log(`ICE state: ${iceState}`)
      if (iceState === 'failed') {
        handleFailure()
      } else if (iceState === 'connected' || iceState === 'completed') {
        log('ICE connection established!')
      }
    }
  }, [onConnected, onDisconnected, onError, callId, otherUserId, socketRef, handleTrack, sendICECandidate, isCaller])

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

  // Get user media — uses robustGetCamera for video, falls back to audio-only
  const getMedia = useCallback(async (withVideo: boolean): Promise<MediaStream> => {
    log(`Requesting media (video: ${withVideo})...`)
    setIsAcquiringMedia(true)
    setCameraError(null)
    try {
      let stream: MediaStream
      if (withVideo) {
        // Try robust camera acquisition (3 strategies)
        try {
          stream = await robustGetCamera()
          // Merge with audio constraints since robustGetCamera only returns video
          const audioStream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY_CONSTRAINTS)
          audioStream.getVideoTracks().forEach(t => t.stop())
          audioStream.getAudioTracks().forEach(t => stream.addTrack(t))
        } catch (camErr: any) {
          log(`All camera strategies failed: ${camErr.message}`)
          // Fall back to audio-only
          stream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY_CONSTRAINTS)
          setIsVideoEnabled(false)
          setCameraError('Camera unavailable. Tap the camera button or preview to enable it.')
          localStreamRef.current = stream
          setIsAudioEnabled(true)
          attachLocalStream(stream)
          return stream
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY_CONSTRAINTS)
      }
      log(`Media obtained: ${stream.getAudioTracks().length} audio, ${stream.getVideoTracks().length} video tracks`)
      localStreamRef.current = stream
      setIsAudioEnabled(true)
      setIsVideoEnabled(stream.getVideoTracks().length > 0)
      attachLocalStream(stream)
      return stream
    } catch (err: any) {
      log(`Media error: ${err.name} - ${err.message}`)
      setCameraError('Microphone access denied. Please check permissions and reload.')
      throw new Error('Media access denied. Please allow microphone and refresh.')
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

      // ─── CRITICAL: Wait for ICE gathering before sending offer ───
      // This embeds ALL ICE candidates (host, srflx, relay) into the SDP.
      // Without this, cross-network calls fail because trickle ICE candidates
      // can be lost due to signaling delays or strict NATs.
      log('Waiting for ICE gathering to complete (max 3s)...')
      const completeOffer = await waitForIceGathering(pc, 3000)

      // Diagnose ICE candidate types — helps debug TURN connectivity
      logIceCandidateTypes(pc)

      socketRef.current.emit('webrtc-offer', {
        callId,
        toUserId: otherUserId,
        sdp: completeOffer.toJSON(),
      })
      log(`Offer sent to ${otherUserId.slice(0, 8)}... (ICE candidates embedded)`)
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

          // ─── CRITICAL: Wait for ICE gathering before sending answer ───
          // Same as offer: embed all candidates for cross-network reliability
          log('Waiting for ICE gathering to complete (max 3s)...')
          const completeAnswer = await waitForIceGathering(pc, 3000)

          // Diagnose ICE candidate types
          logIceCandidateTypes(pc)

          if (socketRef.current?.connected) {
            socketRef.current.emit('webrtc-answer', {
              callId,
              toUserId: otherUserId,
              sdp: completeAnswer.toJSON(),
            })
            log('Answer sent back (ICE candidates embedded)')
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
  const toggleVideo = useCallback(async () => {
    // Debounce: ignore rapid taps (prevent retry spam)
    if (cameraRetryTimerRef.current) return
    if (isAcquiringMedia) return

    const stream = localStreamRef.current
    const videoTracks = stream?.getVideoTracks() ?? []

    // If video tracks exist, just toggle enabled state
    if (videoTracks.length > 0) {
      const willEnable = !videoTracks.some((t) => t.enabled)
      videoTracks.forEach((t) => { t.enabled = willEnable })
      setIsVideoEnabled(willEnable)
      if (!willEnable) setCameraError(null) // Clear error when manually turning off
      return
    }

    // No video tracks — try robust camera acquisition
    log('No video tracks, attempting to acquire camera...')
    setIsAcquiringMedia(true)
    setCameraError(null)
    try {
      const camStream = await robustGetCamera()
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
      log(`Camera toggle failed: ${(err as Error).name} - ${err.message}`)
      if ((err as Error).name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera in browser settings and try again.')
      } else if ((err as Error).name === 'NotFoundError') {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError('Camera is busy or unavailable. Close other apps using the camera and try again in a few seconds.')
      }
      // Set 3-second cooldown before next retry allowed
      cameraRetryTimerRef.current = setTimeout(() => {
        cameraRetryTimerRef.current = null
      }, 3000)
    } finally {
      setIsAcquiringMedia(false)
    }
  }, [isAcquiringMedia, callId, otherUserId, socketRef, attachLocalStream])

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
    
    // Notify the other peer via socket that this call is ending
    try {
      const socket = socketRef.current
      if (socket?.connected) {
        socket.emit('call-ended', {
          callId,
          toUserId: otherUserId,
          reason: 'user-ended',
        })
        log('Emitted call-ended to peer')
      }
    } catch (e) {
      log('Failed to emit call-ended:', e)
    }
    
    cleanup()
    onDisconnected(duration)
  }, [callId, otherUserId, socketRef, cleanup, onDisconnected])

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

      {/* Remote placeholder — only show when still connecting, hide once connected */}
      {!isRemoteVideoPresent && callStatus === 'connecting' && (
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
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-white/40 text-sm">
                {isCaller ? `Connecting to ${otherPersonName}...` : `Waiting for ${otherPersonName} to connect...`}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Connected but remote video not yet showing — brief avatar without "connecting" text */}
      {!isRemoteVideoPresent && callStatus === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold text-white">{getInitials(otherPersonName)}</span>
            </div>
            <p className="text-white/80 text-lg font-medium">{otherPersonName}</p>
            <p className="text-white/40 text-sm mt-2">Connected — video loading...</p>
          </div>
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
                if (isAcquiringMedia) return
                try {
                  setCameraError(null)
                  setIsAcquiringMedia(true)
                  const camStream = await robustGetCamera()
                  // Merge with audio
                  const audioStream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY_CONSTRAINTS)
                  audioStream.getVideoTracks().forEach(t => t.stop())
                  audioStream.getAudioTracks().forEach(t => camStream.addTrack(t))
                  // Stop old tracks
                  localStreamRef.current?.getTracks().forEach(t => t.stop())
                  localStreamRef.current = camStream
                  setIsVideoEnabled(camStream.getVideoTracks().length > 0)
                  setIsAudioEnabled(true)
                  // Add new tracks to peer connection
                  const pc = pcRef.current
                  if (pc) {
                    const senders = pc.getSenders()
                    camStream.getVideoTracks().forEach(track => {
                      const existingVideoSender = senders.find(s => s.track?.kind === 'video')
                      if (existingVideoSender) {
                        existingVideoSender.replaceTrack(track)
                      } else {
                        pc.addTrack(track, camStream)
                      }
                    })
                    camStream.getAudioTracks().forEach(track => {
                      const existingAudioSender = senders.find(s => s.track?.kind === 'audio')
                      if (existingAudioSender) {
                        existingAudioSender.replaceTrack(track)
                      } else {
                        pc.addTrack(track, camStream)
                      }
                    })
                  }
                  attachLocalStream(camStream)
                  log('Camera retry from banner succeeded!')
                } catch (err: any) {
                  setCameraError('Camera still unavailable. Close other apps using it and try again.')
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
