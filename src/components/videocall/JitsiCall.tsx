'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, Video, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getJitsiScriptSrc,
  JITSI_CONFIG_OVERWRITE,
  JITSI_EVENTS,
  JITSI_DOMAIN,
} from '@/lib/jitsi'

type JitsiAPI = unknown

export interface JitsiCallHandle {
  endCall: () => void
}

interface JitsiCallProps {
  roomName: string
  userName: string
  userEmail?: string
  userAvatar?: string
  onCallEnd: (durationSeconds: number) => void
  onError: (error: string) => void
  onParticipantsChange?: (count: number) => void
  onAudioMutedChange?: (muted: boolean) => void
  onVideoMutedChange?: (muted: boolean) => void
  onScreenShareChange?: (sharing: boolean) => void
  onMeetingReady?: () => void
}

type LoadingState = 'idle' | 'loading-script' | 'initializing' | 'ready' | 'error'

export const JitsiCall = forwardRef<JitsiCallHandle, JitsiCallProps>(
  function JitsiCallInner({
    roomName,
    userName,
    userEmail,
    userAvatar,
    onCallEnd,
    onError,
    onParticipantsChange,
    onAudioMutedChange,
    onVideoMutedChange,
    onScreenShareChange,
    onMeetingReady,
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const apiRef = useRef<JitsiAPI | null>(null)
    const joinedAtRef = useRef<Date | null>(null)
    const isDisposedRef = useRef(false)
    const [loadingState, setLoadingState] = useState<LoadingState>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const retryCountRef = useRef(0)
    const MAX_RETRIES = 2

    // Expose endCall method to parent via ref
    useImperativeHandle(ref, () => ({
      endCall: () => {
        if (apiRef.current) {
          try {
            ;(apiRef.current as { executeCommand: (cmd: string) => void }).executeCommand('hangup')
          } catch {
            handleCallEnded()
          }
        } else {
          handleCallEnded()
        }
      }
    }), [/* stable — handleCallEnded is a ref-based callback */])

    // Track whether the page is visible
    const [isPageVisible, setIsPageVisible] = useState(true)

    // Stable refs for callbacks so Jitsi event handlers don't go stale
    const onCallEndRef = useRef(onCallEnd)
    onCallEndRef.current = onCallEnd

    const onErrorRef = useRef(onError)
    onErrorRef.current = onError

    const onMeetingReadyRef = useRef(onMeetingReady)
    onMeetingReadyRef.current = onMeetingReady

    const onParticipantsChangeRef = useRef(onParticipantsChange)
    onParticipantsChangeRef.current = onParticipantsChange

    const onAudioMutedChangeRef = useRef(onAudioMutedChange)
    onAudioMutedChangeRef.current = onAudioMutedChange

    const onVideoMutedChangeRef = useRef(onVideoMutedChange)
    onVideoMutedChangeRef.current = onVideoMutedChange

    const onScreenShareChangeRef = useRef(onScreenShareChange)
    onScreenShareChangeRef.current = onScreenShareChange

    // Handle page visibility changes
    useEffect(() => {
      const handleVisibility = () => {
        setIsPageVisible(!document.hidden)
      }
      document.addEventListener('visibilitychange', handleVisibility)
      return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [])

    // Load Jitsi External API script dynamically
    const loadJitsiScript = useCallback((): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if ((window as unknown as Record<string, unknown>).JitsiMeetExternalAPI) {
          resolve()
          return
        }

        // Timeout after 15 seconds
        const timeout = setTimeout(() => {
          reject(new Error('Video service could not be loaded. Please check your internet connection or try again later.'))
        }, 15000)

        const script = document.createElement('script')
        script.src = getJitsiScriptSrc()
        script.async = true
        script.crossOrigin = 'anonymous'
        script.onload = () => {
          clearTimeout(timeout)
          resolve()
        }
        script.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Failed to load Jitsi Meet. Please check your internet connection.'))
        }
        document.head.appendChild(script)
      })
    }, [])

    // Cleanup Jitsi instance
    const disposeJitsi = useCallback(() => {
      if (isDisposedRef.current) return
      isDisposedRef.current = true

      if (apiRef.current) {
        try {
          ;(apiRef.current as { dispose: () => void }).dispose()
        } catch (e) {
          // Silently ignore dispose errors
          console.warn('Jitsi dispose warning:', e)
        }
        apiRef.current = null
      }

      // Clear the container
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }, [])

    // Handle call ended - calculate duration and notify parent
    const handleCallEnded = useCallback(() => {
      if (isDisposedRef.current) return

      let durationSeconds = 0
      if (joinedAtRef.current) {
        durationSeconds = Math.floor((Date.now() - joinedAtRef.current.getTime()) / 1000)
      }

      disposeJitsi()
      onCallEndRef.current(durationSeconds)
    }, [disposeJitsi])

    // Initialize Jitsi meeting
    const initMeeting = useCallback(async () => {
      if (!containerRef.current || isDisposedRef.current) return

      setLoadingState('loading-script')
      setErrorMsg(null)

      try {
        // Load the Jitsi script
        await loadJitsiScript()

        if (isDisposedRef.current) return

        setLoadingState('initializing')

        const JitsiMeetExternalAPI = (window as unknown as Record<string, unknown>).JitsiMeetExternalAPI as new (domain: string, options: Record<string, unknown>) => JitsiAPI

        if (!JitsiMeetExternalAPI) {
          throw new Error('Jitsi Meet API not available')
        }

        // Create the meeting instance
        const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          configOverwrite: {
            ...JITSI_CONFIG_OVERWRITE,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disablePrejoinPage: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            SHOW_DEEP_LINKING_IMAGE: false,
            SHOW_POWERED_BY: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'desktop',
              'tileview',
              'chat',
              'hangup',
              'settings',
              'raisehand',
              'fullscreen',
            ],
            VIDEO_QUALITY_LABEL_DISABLED: true,
            CONNECTION_INDICATOR_AUTO_HIDE: true,
            CONNECTION_INDICATOR_AUTO_HIDE_TIMEOUT: 5000,
            FILM_STRIP_MAX_HEIGHT: 120,
            DEFAULT_LOCAL_DISPLAY_NAME: userName,
          },
          userInfo: {
            displayName: userName,
            email: userEmail || undefined,
            avatarUrl: userAvatar || undefined,
          },
          lang: 'en',
        })

        apiRef.current = api

        // --- Event listeners ---

        // Meeting joined successfully
        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.VIDEO_CONFERENCE_JOINED, () => {
          if (isDisposedRef.current) return
          joinedAtRef.current = new Date()
          setLoadingState('ready')
          onMeetingReadyRef.current?.()
        })

        // Participant count changes
        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.PARTICIPANT_JOINED, () => {
          if (isDisposedRef.current) return
          try {
            const count = (api as { getNumberOfParticipants: () => number }).getNumberOfParticipants()
            onParticipantsChangeRef.current?.(count)
          } catch {
            // Ignore errors from getNumberOfParticipants
          }
        })

        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.PARTICIPANT_LEFT, () => {
          if (isDisposedRef.current) return
          try {
            const count = (api as { getNumberOfParticipants: () => number }).getNumberOfParticipants()
            onParticipantsChangeRef.current?.(count)
          } catch {
            // Ignore errors
          }
        })

        // Audio mute changes
        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.AUDIO_MUTED_CHANGED, (e: unknown) => {
          if (isDisposedRef.current) return
          const ev = e as { muted: boolean } | null
          onAudioMutedChangeRef.current?.(!!ev?.muted)
        })

        // Video mute changes
        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.VIDEO_MUTED_CHANGED, (e: unknown) => {
          if (isDisposedRef.current) return
          const ev = e as { muted: boolean } | null
          onVideoMutedChangeRef.current?.(!!ev?.muted)
        })

        // Screen sharing changes
        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.SCREEN_SHARE_STATUS_CHANGED, (e: unknown) => {
          if (isDisposedRef.current) return
          const ev = e as { on: boolean } | null
          onScreenShareChangeRef.current?.(!!ev?.on)
        })

        // Conference left / ready to close
        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.CONFERENCE_LEFT, () => {
          if (isDisposedRef.current) return
          handleCallEnded()
        })

        ;(api as { addEventListener: (evt: string, fn: (...args: unknown[]) => void) => void }).addEventListener(JITSI_EVENTS.READY_TO_CLOSE, () => {
          if (isDisposedRef.current) return
          handleCallEnded()
        })

      } catch (error) {
        if (isDisposedRef.current) return

        const message = error instanceof Error ? error.message : 'Failed to start video call'

        // Auto-retry if we haven't exceeded max retries
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1
          toast.info('Retrying connection...', {
            description: `Attempt ${retryCountRef.current} of ${MAX_RETRIES}`,
          })
          setTimeout(() => {
            if (!isDisposedRef.current) {
              initMeeting()
            }
          }, 2000)
        } else {
          setLoadingState('error')
          setErrorMsg(message)
          onErrorRef.current(message)
        }
      }
    }, [roomName, userName, userEmail, userAvatar, loadJitsiScript, handleCallEnded])

    // Initialize on mount
    useEffect(() => {
      initMeeting()

      return () => {
        disposeJitsi()
      }
    }, [initMeeting, disposeJitsi])

    // Retry on error
    const handleRetry = useCallback(() => {
      retryCountRef.current = 0
      setErrorMsg(null)
      isDisposedRef.current = false
      initMeeting()
    }, [initMeeting])

    // Loading screen
    if (loadingState === 'loading-script' || loadingState === 'initializing') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-8 h-8 text-rose-500" />
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-white/90 text-lg font-medium">
              {loadingState === 'loading-script' ? 'Loading video service...' : 'Connecting to call...'}
            </p>
            <p className="text-white/40 text-sm mt-1">
              {loadingState === 'loading-script'
                ? 'Downloading MUMAA video components'
                : `Joining room: ${roomName}`}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
            <span className="text-xs text-white/50">Please wait...</span>
          </div>
        </div>
      )
    }

    // Error screen with retry
    if (loadingState === 'error') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10 p-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Connection Failed</h3>
          <p className="text-white/50 text-sm text-center max-w-md mb-6">
            {errorMsg || 'Could not connect to the video call service. Please check your internet connection and try again.'}
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRetry}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
            <Button
              onClick={() => onErrorRef.current('User cancelled')}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-full px-6"
            >
              Cancel
            </Button>
          </div>
        </div>
      )
    }

    return (
      <>
        {/* Jitsi container - this is where the video meeting will be rendered */}
        <div
          ref={containerRef}
          className="absolute inset-0 z-0"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Page hidden warning */}
        {!isPageVisible && loadingState === 'ready' && (
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center p-3 bg-amber-500">
            <p className="text-sm font-medium text-white">
              You&apos;ve switched tabs — your call is still active
            </p>
          </div>
        )}
      </>
    )
  }
)
