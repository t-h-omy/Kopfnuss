// Kopfnuss - Audio Manager
// Minimal, safe audio subsystem with WebAudio for SFX playback
// Falls back to synthesized beeps when audio files are missing

import { logWarn } from './logging.js';

/**
 * Sound effect definitions with their synthesized fallback parameters
 * Each SFX has: freq (Hz or array for chords), duration (seconds), type (oscillator), gain (0-1)
 */
const SFX_DEFINITIONS = {
  // Answer feedback
  answer_correct: { freq: [523, 659, 784], duration: 0.15, type: 'sine', gain: 0.25 },
  answer_incorrect: { freq: 200, duration: 0.2, type: 'triangle', gain: 0.25 },
  
  // Task/Challenge flow
  new_task: { freq: 880, duration: 0.08, type: 'sine', gain: 0.2 },
  challenge_start: { freq: [440, 554, 659], duration: 0.18, type: 'sine', gain: 0.25 },
  challenge_complete: { freq: [523, 659, 784, 1047], duration: 0.25, type: 'sine', gain: 0.28 },
  challenge_failed: { freq: [300, 250, 200], duration: 0.3, type: 'triangle', gain: 0.25 },
  
  // Timer sounds
  countdown_tick: { freq: 1000, duration: 0.03, type: 'sine', gain: 0.15 },
  times_up: { freq: [400, 300, 200], duration: 0.4, type: 'triangle', gain: 0.3 },
  low_time_warning: { freq: [600, 500], duration: 0.1, type: 'triangle', gain: 0.3 },
  time_challenge_music: { freq: 440, duration: 0.5, type: 'sine', gain: 0.15 }, // Fallback for Zeit challenge looping music
  
  // Diamond/Currency sounds
  diamond_earn: { freq: [880, 1047, 1319], duration: 0.12, type: 'sine', gain: 0.25 },
  diamond_spend: { freq: [659, 523], duration: 0.1, type: 'sine', gain: 0.2 },
  
  // Background/Unlock sounds
  background_unlocked: { freq: [523, 659, 784, 1047], duration: 0.3, type: 'sine', gain: 0.28 },
  
  // Popup sounds
  popup_reward_open: { freq: [523, 659, 784, 1047], duration: 0.2, type: 'sine', gain: 0.25 },
  modal_open: { freq: 440, duration: 0.06, type: 'sine', gain: 0.2 },
  modal_close: { freq: 350, duration: 0.06, type: 'sine', gain: 0.2 },
  
  // UI interaction sounds
  ui_click: { freq: 600, duration: 0.05, type: 'sine', gain: 0.3 },
  node_select: { freq: 800, duration: 0.08, type: 'sine', gain: 0.3 },
  reward_claim: { freq: [784, 988, 1175], duration: 0.15, type: 'sine', gain: 0.28 },
  back_close: { freq: 350, duration: 0.06, type: 'sine', gain: 0.2 },
  screen_change: { freq: 550, duration: 0.07, type: 'sine', gain: 0.18 },
  
  // Effect sounds
  sparkle_effect: { freq: 1200, duration: 0.03, type: 'sine', gain: 0.2 },
  node_highlight: { freq: [700, 880], duration: 0.1, type: 'sine', gain: 0.2 },
  
  // Feedback sounds
  action_not_allowed: { freq: [300, 250], duration: 0.15, type: 'triangle', gain: 0.25 },
  
  // Popup-specific sounds
  streak_popup: { freq: [659, 784, 988], duration: 0.15, type: 'sine', gain: 0.25 },
  premium_challenge_popup: { freq: [440, 554, 659], duration: 0.18, type: 'sine', gain: 0.25 },
  super_challenge_popup: { freq: [523, 659, 784], duration: 0.2, type: 'sine', gain: 0.28 },
  
  // Background purchase sounds
  background_purchased: { freq: [523, 659], duration: 0.1, type: 'sine', gain: 0.2 },
  
  // Legacy aliases (for backwards compatibility)
  success_fanfare: { freq: [523, 659, 784, 1047], duration: 0.2, type: 'sine', gain: 0.25 },
  confetti_pop: { freq: 1200, duration: 0.03, type: 'sine', gain: 0.2 },
  diamond_gain: { freq: [880, 1047, 1319], duration: 0.12, type: 'sine', gain: 0.25 },
  streak_gain: { freq: [659, 784, 988], duration: 0.15, type: 'sine', gain: 0.25 },
  not_enough_diamonds_hint: { freq: [300, 250], duration: 0.15, type: 'triangle', gain: 0.25 }
};

/**
 * AudioManager singleton class
 * Provides preloading and playback of sound effects with WebAudio
 */
class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.audioContext = null;
    
    /** @type {Map<string, AudioBuffer>} */
    this.buffers = new Map();
    
    /** @type {boolean} */
    this.contextResumed = false;
    
    /** @type {boolean} */
    this.muted = false;
    
    /** @type {AudioBufferSourceNode|null} */
    this.currentMusicSource = null;
    
    /** @type {GainNode|null} */
    this.currentMusicGain = null;
  }

  /**
   * Get or create the AudioContext
   * @returns {AudioContext|null}
   */
  getContext() {
    if (!this.audioContext) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      } catch (e) {
        logWarn('AudioManager: Failed to create AudioContext', e);
      }
    }
    return this.audioContext;
  }

  /**
   * Resume AudioContext on first user gesture (required for mobile)
   * Call this from a click/touch handler
   */
  ensureUserGestureResume() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.contextResumed = true;
      }).catch(() => {
        // Silently ignore resume failures
      });
    } else if (ctx) {
      this.contextResumed = true;
    }
  }

  /**
   * Attempt to load a single SFX file, trying .wav then .ogg
   * @param {string} name - Sound effect name
   * @returns {Promise<void>}
   */
  async loadSound(name) {
    const ctx = this.getContext();
    if (!ctx) return;

    const basePath = './assets/sfx/';
    const extensions = ['.wav', '.ogg'];

    for (const ext of extensions) {
      try {
        const response = await fetch(basePath + name + ext);
        if (!response.ok) continue;
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
        return;
      } catch (e) {
        // Try next extension
      }
    }
    // File not found or failed to decode - fallback will be used
  }

  /**
   * Preload all defined SFX files
   * Non-blocking - failures are silently ignored (synth fallback will be used)
   * @returns {Promise<void>}
   */
  async preloadAll() {
    // Ensure context exists (but may be suspended until user gesture)
    this.getContext();

    const names = Object.keys(SFX_DEFINITIONS);
    
    // Load all sounds in parallel, ignoring individual failures
    await Promise.allSettled(names.map(name => this.loadSound(name)));
  }

  /**
   * Play a synthesized fallback sound
   * @param {string} name - Sound effect name
   * @param {Object} options - Playback options
   * @param {number} [options.volume=1] - Volume multiplier (0-1)
   */
  playSynthFallback(name, options = {}) {
    const ctx = this.getContext();
    if (!ctx || ctx.state === 'suspended') return;

    const def = SFX_DEFINITIONS[name];
    if (!def) return;

    const volume = options.volume ?? 1;
    const masterGain = def.gain * volume;
    
    const frequencies = Array.isArray(def.freq) ? def.freq : [def.freq];
    const duration = def.duration;
    const now = ctx.currentTime;

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = def.type || 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(masterGain, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Stagger notes slightly for chord effects
      const startTime = now + (index * 0.05);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * Play a sound effect by name
   * Uses preloaded audio buffer if available, otherwise synthesized fallback
   * @param {string} name - Sound effect name (e.g., 'ui_click', 'success_fanfare')
   * @param {Object} [options] - Playback options
   * @param {number} [options.volume=1] - Volume multiplier (0-1)
   * @param {boolean} [options.loop=false] - Whether to loop the sound (for music)
   */
  play(name, options = {}) {
    if (this.muted) return;

    const ctx = this.getContext();
    if (!ctx) return;

    // If context is suspended, try to resume (will work if called from user gesture)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return; // Don't play on this call, will work on next user gesture
    }

    const buffer = this.buffers.get(name);
    
    if (buffer) {
      // Play from preloaded buffer
      try {
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        
        source.buffer = buffer;
        source.loop = (options.loop === true);
        gainNode.gain.value = options.volume ?? 1;
        
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        
        // Store reference if this is looping music
        if (options.loop) {
          this.stopMusic(); // Stop any currently playing music first
          this.currentMusicSource = source;
          this.currentMusicGain = gainNode;
        }
      } catch (e) {
        // Fallback to synth if buffer playback fails
        this.playSynthFallback(name, options);
      }
    } else {
      // Use synthesized fallback
      this.playSynthFallback(name, options);
    }
  }

  /**
   * Play looping background music
   * @param {string} name - Music name
   * @param {Object} [options] - Playback options
   * @param {number} [options.volume=0.5] - Volume multiplier (0-1), default lower for music
   */
  playMusic(name, options = {}) {
    this.play(name, {
      volume: options.volume ?? 0.5,
      loop: true
    });
  }

  /**
   * Stop currently playing background music
   */
  stopMusic() {
    if (this.currentMusicSource) {
      try {
        // Check if source is already stopped to prevent errors
        if (this.currentMusicSource.context.state !== 'closed') {
          this.currentMusicSource.stop();
        }
      } catch (e) {
        // Already stopped or invalid state - this is fine
      }
      this.currentMusicSource = null;
      this.currentMusicGain = null;
    }
  }

  /**
   * Fade out and stop currently playing music, then start new music
   * @param {string} newMusicName - Name of new music to play
   * @param {Object} [options] - Options for new music
   * @param {number} [fadeDuration=1] - Fade duration in seconds
   */
  crossfadeMusic(newMusicName, options = {}, fadeDuration = 1) {
    const ctx = this.getContext();
    if (!ctx) return;

    // Fade out current music if playing
    if (this.currentMusicGain && this.currentMusicSource) {
      const now = ctx.currentTime;
      const currentGain = this.currentMusicGain;
      const currentSource = this.currentMusicSource;
      
      // Fade out
      try {
        currentGain.gain.setValueAtTime(currentGain.gain.value, now);
        currentGain.gain.linearRampToValueAtTime(0.001, now + fadeDuration);
        
        // Stop after fade completes
        setTimeout(() => {
          try {
            if (currentSource.context.state !== 'closed') {
              currentSource.stop();
            }
          } catch (e) {
            // Already stopped
          }
        }, fadeDuration * 1000);
      } catch (e) {
        // Fade failed, just stop
        try {
          currentSource.stop();
        } catch (e2) {
          // Already stopped
        }
      }
    }
    
    // Start new music after a short delay to ensure old one is fading
    // Don't clear currentMusicSource yet - wait for new music to start
    setTimeout(() => {
      this.playMusic(newMusicName, options);
    }, 100);
  }

  /**
   * Set muted state
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.muted = muted;
  }

  /**
   * Check if a sound is available (either as buffer or synth fallback)
   * @param {string} name
   * @returns {boolean}
   */
  hasSound(name) {
    return this.buffers.has(name) || Object.hasOwn(SFX_DEFINITIONS, name);
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
