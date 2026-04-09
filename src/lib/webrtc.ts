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
 * - OR deploy the bundled turn-service mini-service
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
      if (data.turnUrl) {
        console.log('[WebRTC] TURN config loaded from /api/config:', data.turnUrl.substring(0, 50) + '...');
      } else {
        console.warn('[WebRTC] /api/config returned empty TURN credentials — cross-network calls may fail');
      }
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[WebRTC] Failed to fetch /api/config:', err);
  }

  return { turnUrl: '', turnUsername: '', turnCredential: '' };
}

/**
 * Wait for ICE gathering to complete on a peer connection.
 * Returns the complete local description with all candidates embedded.
 * Times out after `timeoutMs` and returns whatever was gathered so far.
 *
 * This is critical for cross-network calls: embedding all ICE candidates
 * in the SDP makes the connection much more reliable than relying solely
 * on trickle ICE (where candidates can be lost due to signaling delays).
 */
export function waitForIceGathering(pc: RTCPeerConnection, timeoutMs: number = 5000): Promise<RTCSessionDescriptionInit> {
  return new Promise((resolve) => {
    // If gathering already complete, return immediately
    if (pc.iceGatheringState === 'complete') {
      resolve(pc.localDescription!);
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.log('[WebRTC] ICE gathering timed out after', timeoutMs, 'ms — sending with gathered candidates');
        resolve(pc.localDescription!);
      }
    }, timeoutMs);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete' && !settled) {
        settled = true;
        clearTimeout(timeout);
        console.log('[WebRTC] ICE gathering complete — all candidates embedded in SDP');
        resolve(pc.localDescription!);
      }
    };

    // Also resolve if the connection is already established (early connection)
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected' && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(pc.localDescription!);
      }
    };
  });
}

/**
 * Log ICE candidate types for debugging TURN connectivity.
 * Call this after ICE gathering to see which candidate types were found.
 */
export function logIceCandidateTypes(pc: RTCPeerConnection): void {
  const stats = pc.getStats()
  stats.then(report => {
    let hostCount = 0, srflxCount = 0, relayCount = 0, prflxCount = 0
    report.forEach((entry) => {
      if (entry.type === 'local-candidate' || entry.type === 'candidate-pair') {
        if (entry.candidateType === 'host') hostCount++
        else if (entry.candidateType === 'srflx') srflxCount++
        else if (entry.candidateType === 'relay') relayCount++
        else if (entry.candidateType === 'prflx') prflxCount++
      }
    })
    console.log(`[WebRTC] ICE candidates gathered — host: ${hostCount}, srflx: ${srflxCount}, relay: ${relayCount}, prflx: ${prflxCount}`)
    if (relayCount === 0) {
      console.warn('[WebRTC] ⚠️ NO relay candidates found! TURN server may be unreachable or credentials are wrong. Cross-network calls will likely fail.')
    } else {
      console.log('[WebRTC] ✓ Relay candidates found — TURN server is working')
    }
  }).catch(() => {})
}

/**
 * Create a peer connection with relay-only ICE transport policy.
 * Used as fallback when standard P2P connection fails.
 */
export async function getRelayOnlyIceConfig(): Promise<RTCConfiguration> {
  const config = await getIceServers();
  return {
    ...config,
    iceTransportPolicy: 'relay',
  };
}

export async function getIceServers(): Promise<RTCConfiguration> {
  const servers: RTCIceServer[] = [
    // Google STUN servers (free, reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Mozilla STUN
    { urls: 'stun:stun.services.mozilla.com:3478' },
    // STUN Protocol
    { urls: 'stun:stun.stunprotocol.org:3478' },
    // Twilio STUN
    { urls: 'stun:global.stun.twilio.com:3478' },
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
    // User's custom TURN server (configured in env vars) — highest priority
    const urls = turnUrl.split(',').map(u => u.trim()).filter(Boolean)
    servers.push({ urls, username: turnUser, credential: turnCred })
    console.log('[WebRTC] Custom TURN configured:', urls.length, 'URL(s):', urls.map(u => u.replace(/\/\/.*@/, '//***@')).join(', '))
  } else {
    // ─── Fallback: Free TURN servers ───────────────────────────────────
    // WARNING: These free TURN servers are community projects and may be
    // unreliable, rate-limited, or temporarily down.
    // For production, ALWAYS configure your own TURN credentials.
    console.warn('[WebRTC] No custom TURN configured — using free fallback TURN servers (may be unreliable)')

    // Metered.ca Open Relay (free community project)
    const meteredUser = 'openrelayproject'
    const meteredCred = 'openrelayproject'
    servers.push(
      { urls: 'turn:openrelay.metered.ca:80', username: meteredUser, credential: meteredCred },
      { urls: 'turn:openrelay.metered.ca:443', username: meteredUser, credential: meteredCred },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: meteredUser, credential: meteredCred },
      { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: meteredUser, credential: meteredCred },
      { urls: 'turn:openrelay.metered.ca:8060', username: meteredUser, credential: meteredCred },
      { urls: 'turn:openrelay.metered.ca:8060?transport=tcp', username: meteredUser, credential: meteredCred },
    )

    console.log('[WebRTC] Total ICE servers:', servers.length, '(STUN + TURN fallbacks)')
  }

  return {
    iceServers: servers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
  }
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
