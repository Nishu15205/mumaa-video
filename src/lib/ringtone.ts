// Ringtone player utility for incoming video calls
// Generates a pleasant two-tone ring using Web Audio API

let audioContext: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

/**
 * Ensure AudioContext is unlocked by a user gesture.
 * Browsers require a user interaction before allowing audio playback.
 */
function unlockAudioContext(): void {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

// Auto-unlock on first user interaction (click, touch, keydown)
if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockAudioContext();
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    // Try resume - will work if user has interacted with page
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * Play a single two-tone "ding-ding" pattern
 */
function playSingleRing(ctx: AudioContext, volume: number = 0.3) {
  const now = ctx.currentTime;

  // First tone - higher frequency, sweet bell-like
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1); // Sweep up
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.4);

  // Second tone - slightly lower, creating a pleasant interval
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(660, now + 0.15); // E5
  osc2.frequency.exponentialRampToValueAtTime(880, now + 0.25);
  gain2.gain.setValueAtTime(0, now + 0.15);
  gain2.gain.linearRampToValueAtTime(volume * 0.8, now + 0.17);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.6);

  // Third gentle tone - very soft, adds richness
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(1050, now + 0.3); // C6
  gain3.gain.setValueAtTime(0, now + 0.3);
  gain3.gain.linearRampToValueAtTime(volume * 0.5, now + 0.32);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.start(now + 0.3);
  osc3.stop(now + 0.7);
}

/**
 * Start playing ringtone in a loop (every 1.5 seconds)
 */
export function startRingtone() {
  if (isPlaying) return;
  isPlaying = true;

  try {
    const ctx = getAudioContext();
    // Play immediately
    playSingleRing(ctx, 0.35);
    // Then repeat every 2 seconds
    ringInterval = setInterval(() => {
      if (isPlaying) {
        playSingleRing(getAudioContext(), 0.35);
      }
    }, 2000);
  } catch {
    // Web Audio API not available
  }
}

/**
 * Stop the ringtone
 */
export function stopRingtone() {
  isPlaying = false;
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}

/**
 * Play a single short notification beep (for when a call arrives but user is on another tab)
 */
export function playNotificationBeep() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, now); // C6
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Web Audio API not available
  }
}
