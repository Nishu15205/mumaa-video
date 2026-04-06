// ============================================================
// MUMAA Platform - WebRTC Configuration
// ============================================================

/**
 * ICE servers for NAT traversal on all networks (mobile + desktop).
 *
 * TURN credentials are fetched at RUNTIME from /api/config endpoint
 * (server-side env vars) so no NEXT_PUBLIC_ rebuild is needed.
 *
 * For production deployment on Render:
 * - Set SOCKET_API_URL env var on mumaa-web (server-side, no NEXT_PUBLIC_ needed)
 * - Set TURN_URL, TURN_USERNAME, TURN_CREDENTIAL env vars on mumaa-web
 *
 * Without TURN: STUN works when both users have favorable NAT
 * With TURN: Works on ALL networks including strict mobile NAT
 */

/** Cached TURN config fetched from /api/config */
let cachedConfig: { turnUrl: string; turnUsername: string; turnCredential: string } | null = null;

async function fetchTurnConfig(): Promise<{ turnUrl: string; turnUsername: string; turnCredential: string }> {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      cachedConfig = {
        turnUrl: data.turnUrl || '',
        turnUsername: data.turnUsername || '',
        turnCredential: data.turnCredential || '',
      };
      return cachedConfig;
    }
  } catch {
    // fallback to empty
  }

  return { turnUrl: '', turnUsername: '', turnCredential: '' };
}

export async function getIceServers(): Promise<RTCConfiguration> {
  const servers: RTCIceServer[] = [
    // Google STUN servers (free, reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
  ]

  // Try NEXT_PUBLIC_ vars first (build-time, for local dev)
  let turnUrl = process.env.NEXT_PUBLIC_TURN_URL || ''
  let turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME || ''
  let turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || ''

  // If no build-time vars, fetch from runtime config API
  if (!turnUrl) {
    const cfg = await fetchTurnConfig();
    turnUrl = cfg.turnUrl;
    turnUser = cfg.turnUsername;
    turnCred = cfg.turnCredential;
  }

  if (turnUrl && turnUser && turnCred) {
    const urls = turnUrl.split(',').map(u => u.trim()).filter(Boolean)
    servers.push({ urls, username: turnUser, credential: turnCred })
    console.log('[WebRTC] TURN server configured:', urls.length, 'URL(s)')
  } else {
    // Fallback: Metered.ca Open Relay (free, may have rate limits)
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
