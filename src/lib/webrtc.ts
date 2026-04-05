// ============================================================
// MUMAA Platform - WebRTC Configuration
// ============================================================

/**
 * ICE servers for NAT traversal on all networks (mobile + desktop).
 * 
 * For production deployment:
 * - Set NEXT_PUBLIC_TURN_URL, NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_CREDENTIAL env vars
 *   to use your own TURN server (Twilio, Xirsys, Metered.ca managed, etc.)
 * - Without TURN: STUN works when both users have favorable NAT (same WiFi, mild NAT)
 * - With TURN: Works on ALL networks including strict mobile NAT, corporate firewalls
 * 
 * FREE TURN options for testing:
 * 1. Metered.ca: https://managed.metered.ca (free tier: 50GB/month)
 * 2. Twilio: https://www.twilio.com (free trial with TURN)
 * 3. Xirsys: https://xirsys.com (free tier available)
 */
export function getIceServers(): RTCConfiguration {
  const servers: RTCIceServer[] = [
    // Google STUN servers (free, reliable for discovering public IPs)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // Additional STUN fallbacks
    { urls: 'stun:stun.services.mozilla.com:3478' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
  ]

  // Add custom TURN server if configured via environment variables
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL
  if (turnUrl && turnUser && turnCred) {
    // Support comma-separated TURN URLs for multiple protocols
    const urls = turnUrl.split(',').map(u => u.trim()).filter(Boolean)
    servers.push({ urls, username: turnUser, credential: turnCred })
    console.log('[WebRTC] Custom TURN server configured:', urls.length, 'URL(s)')
  } else {
    // Fallback: Metered.ca Open Relay (free, may have rate limits)
    // NOTE: For production, replace with your own TURN server
    const meteredUser = 'openrelayproject'
    const meteredCred = 'openrelayproject'
    servers.push(
      { urls: 'turn:openrelay.metered.ca:80', username: meteredUser, credential: meteredCred },
      { urls: 'turn:openrelay.metered.ca:443', username: meteredUser, credential: meteredCred },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: meteredUser, credential: meteredCred },
      { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: meteredUser, credential: meteredCred },
    )
  }

  return { iceServers: servers, iceCandidatePoolSize: 10 }
}

/** Default ICE config (uses env vars or fallback free TURN) */
export const ICE_SERVERS: RTCConfiguration = getIceServers()

/**
 * Default media constraints for getUserMedia.
 */
export const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, min: 15 },
    facingMode: 'user',
  },
}

/**
 * Audio-only constraints for when video is off.
 */
export const AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
}

/**
 * Generate a room/call ID for identification.
 */
export function generateCallId(callId: string): string {
  return `mumaa-${callId}`
}
