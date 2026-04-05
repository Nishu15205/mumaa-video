// ============================================================
// MUMAA Platform - Jitsi Meet Configuration
// ============================================================

export const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';

/**
 * Generate a MUMAA room name from a call ID.
 * Format: mumaa-{callId} (URL-safe, short)
 */
export function generateRoomName(callId: string): string {
  return `mumaa-${callId}`;
}

/**
 * Build the Jitsi External API script URL.
 */
export function getJitsiScriptSrc(): string {
  return `https://${JITSI_DOMAIN}/external_api.js`;
}

/**
 * Jitsi Meet configuration overrides.
 * These are passed as `configOverwrite` to the JitsiMeetExternalAPI constructor.
 */
export const JITSI_CONFIG_OVERWRITE = {
  // Disable recording by default
  recordingEnabled: false,

  // Enable chat
  disableChat: false,

  // Enable screen sharing
  screenSharingEnabled: true,

  // Start with tile view for multiple participants
  defaultView: 'tile',

  // Disable features we don't need
  disableProfile: false,
  disablePrejoinPage: false,

  // Audio/Video defaults
  startWithAudioMuted: false,
  startWithVideoMuted: false,

  // Turn off lobby for MUMAA calls
  prejoinPageEnabled: true,

  // Enable captions if available
  captionsEnabled: true,

  // Channel last N
  channelLastN: 20,

  // Use VP9 if available for better quality
  preferH264: false,

  // Disable local recording
  localRecordingEnabled: false,

  // Whiteboard disabled
  whiteboardEnabled: false,

  // File sharing
  disableDropbox: true,

  // Calendar
  disableCalendar: true,

  // Customization
  brandingDataUrl: undefined,
  disableThirdPartyRequests: false,
};

/**
 * Jitsi Meet interface configuration overrides.
 * Controls which UI elements are visible.
 */
export const JITSI_INTERFACE_OVERWRITE = {
  // Show only essential toolbar buttons
  TOOLBAR_BUTTONS: [
    'microphone',
    'camera',
    'desktop',
    'tileview',
    'chat',
    'hangup',
    'settings',
    'raisehand',
    'videoquality',
    'fullscreen',
  ],

  // Hide elements we don't need
  SHOW_JITSI_WATERMARK: false,
  SHOW_WATERMARK_FOR_GUESTS: false,
  SHOW_PROMOTIONAL_CLOSE_PAGE: false,
  SHOW_DEEP_LINKING_IMAGE: false,
  SHOW_POWERED_BY: false,

  // Disable various panels
  DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
  DISABLE_VIDEO_BACKGROUND: false,

  // Filmstrip position (vertical on the right)
  FILM_STRIP_MAX_HEIGHT: 120,

  // Bottom toolbar
  BOTTOM_TOOLBAR: true,

  // Initial state
  INITIAL_TOOLBAR_TIMEOUT: 3000,
  TOOLBAR_ALWAYS_VISIBLE: false,
};

/**
 * Jitsi Meet branding/theme overrides for MUMAA.
 */
export const JITSI_BRANDING = {
  // MUMAA rose-500 color (#f43f5e) for buttons and accents
  interfaceConfigOverwrite: {
    ...JITSI_INTERFACE_OVERWRITE,
  },
};

/**
 * Interface for the JitsiMeetExternalAPI (loaded from CDN).
 * We define this locally to avoid needing a type package.
 */
export interface JitsiMeetExternalAPI {
  /**
   * Create and join a Jitsi meeting.
   */
  constructor: new (
    domain: string,
    options: {
      roomName: string;
      parentNode: HTMLElement;
      configOverwrite?: Record<string, unknown>;
      interfaceConfigOverwrite?: Record<string, unknown>;
      userInfo?: {
        displayName: string;
        email?: string;
        avatarUrl?: string;
      };
      lang?: string;
      jwt?: string;
      onload?: () => void;
      invitees?: Array<{ jid: string }>;
      subject?: string;
      onApiReady?: () => void;
    }
  ) => JitsiMeetExternalAPI;

  /** Add event listener. */
  addEventListener(event: string, handler: (...args: unknown[]) => void): void;

  /** Remove event listener. */
  removeEventListener(event: string, handler: (...args: unknown[]) => void): void;

  /** Execute a command on the API. */
  executeCommand(command: string, ...args: unknown[]): void;

  /** Check if a command is available. */
  isCommandSupported(command: string): boolean;

  /** Get participants count. */
  getNumberOfParticipants(): number;

  /** Dispose of the meeting instance. */
  dispose(): void;
}

/**
 * Jitsi event names we care about.
 */
export const JITSI_EVENTS = {
  VIDEO_CONFERENCE_JOINED: 'videoConferenceJoined',
  PARTICIPANT_JOINED: 'participantJoined',
  PARTICIPANT_LEFT: 'participantLeft',
  CONFERENCE_JOINED: 'conferenceJoined',
  CONFERENCE_LEFT: 'conferenceLeft',
  USER_JOINED: 'userJoined',
  USER_LEFT: 'userLeft',
  TRACK_ADDED: 'trackAdded',
  TRACK_REMOVED: 'trackRemoved',
  DOMINANT_SPEAKER_CHANGED: 'dominantSpeakerChanged',
  ENDPOINT_TEXT_MESSAGE_RECEIVED: 'endpointTextMessageReceived',
  PARTICIPANT_CONN_STATUS_CHANGED: 'participantConnectionStatusChanged',
  AUDIO_MUTED_CHANGED: 'audioMuteStatusChanged',
  VIDEO_MUTED_CHANGED: 'videoMuteStatusChanged',
  SCREEN_SHARE_STATUS_CHANGED: 'screenSharingStatusChanged',
  READY_TO_CLOSE: 'readyToClose',
} as const;
