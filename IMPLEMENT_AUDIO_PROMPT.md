# Audio Implementation Notes

This document describes the audio subsystem for the Kopfnuss web app.

## Overview

The audio system provides sound effects (SFX) for UI interactions and game events.
It uses the Web Audio API for playback and includes synthesized fallback sounds
when audio files are not present.

## Architecture

### Files

- `logic/audioManager.js` - Core AudioManager singleton with preloading and playback
- `logic/audioBootstrap.js` - Non-invasive UI integration via event delegation
- `assets/sfx/` - Directory for SFX files (optional, synth fallback used if missing)

### Integration

The audio system hooks into the UI non-invasively using:
- Event delegation on `document` for click sounds
- MutationObserver for popup open/close sounds
- No modifications required to `main.js` or other existing modules

## Expected SFX Files

Place audio files in `assets/sfx/` using these names.
Supported formats: `.wav` (preferred) or `.ogg` (fallback)

### Complete SFX List

| Name | Description | Trigger |
|------|-------------|---------|
| `answer_correct` | Correct answer feedback | Confirming a correct answer |
| `answer_incorrect` | Wrong answer feedback | Confirming a wrong answer |
| `new_task` | New task appears | When the next task is shown |
| `challenge_start` | Challenge begins | When a challenge starts |
| `challenge_complete` | Challenge success | When a challenge is successfully completed |
| `challenge_failed` | Challenge failed | When a challenge is not completed |
| `countdown_tick` | Timer tick | Repeated ticks during final seconds |
| `times_up` | Time's up | When the timer reaches zero |
| `low_time_warning` | Low time warning | When time is running low |
| `diamond_earn` | Earning diamonds | When receiving a diamond |
| `diamond_spend` | Spending diamonds | When spending a diamond |
| `background_unlocked` | Background unlock | When a background is unlocked |
| `popup_reward_open` | Reward popup | When opening a reward popup |
| `modal_open` | Modal/popup open | When any modal opens |
| `modal_close` | Modal/popup close | When any modal closes |
| `ui_click` | Button tap | Generic UI button interactions |
| `node_select` | Challenge node tap | When tapping a challenge node |
| `reward_claim` | Reward claim | When claiming a reward |
| `back_close` | Back/close action | When closing or navigating back |
| `screen_change` | Screen change | When switching tabs/screens |
| `sparkle_effect` | Sparkle trigger | When sparkle effect bursts |
| `node_highlight` | Node highlight | When a node highlight is triggered |
| `action_not_allowed` | Invalid action | When a blocked action is attempted |

### Legacy/Alias SFX (backwards compatible)

| Name | Alias For | Description |
|------|-----------|-------------|
| `success_fanfare` | `challenge_complete` | Celebration sound |
| `confetti_pop` | `sparkle_effect` | Confetti/sparkle effect |
| `diamond_gain` | `diamond_earn` | Diamond earned |
| `streak_gain` | Similar to `challenge_complete` | Streak milestone |
| `not_enough_diamonds_hint` | `action_not_allowed` | Insufficient funds |

### File Naming

Files should be named: `<name>.wav` or `<name>.ogg`

Examples:
- `assets/sfx/ui_click.wav`
- `assets/sfx/challenge_complete.ogg`

The system tries `.wav` first, then `.ogg` if not found.

## Synthesized Fallbacks

When audio files are missing, the system plays synthesized beeps using the Web Audio API.
Each sound has preset parameters (frequency, duration, waveform type) defined in `audioManager.js`.

Fallback sounds are:
- Pleasant and non-intrusive
- Short duration (typically < 400ms)
- Using sine/triangle waveforms for clean tones

## Usage

### Automatic (Default)

The audio bootstrap module automatically:
1. Preloads any available SFX files on startup
2. Plays `ui_click` on button clicks
3. Plays `node_select` on challenge node clicks
4. Plays appropriate sounds when popups open/close

### Manual (Optional)

You can import functions from `audioBootstrap.js` for explicit sound triggers:

```javascript
import { 
  playAnswerFeedback,
  playNewTask,
  playChallengeStart,
  playChallengeComplete,
  playChallengeFailed,
  playCountdownTick,
  playTimesUp,
  playDiamondEarn,
  playDiamondSpend,
  playBackgroundUnlocked,
  playRewardClaim,
  playBackClose,
  playScreenChange,
  playSparkleEffect,
  playNodeHighlight,
  playActionNotAllowed
} from './logic/audioBootstrap.js';

// Examples:
playAnswerFeedback(true);  // Correct answer
playAnswerFeedback(false); // Wrong answer
playChallengeStart();      // Challenge begins
playChallengeComplete();   // Challenge success
playDiamondEarn();         // Earned a diamond
```

Or access the audioManager directly:

```javascript
import { audioManager } from './logic/audioManager.js';

audioManager.play('challenge_complete');
audioManager.play('ui_click', { volume: 0.5 }); // With options
audioManager.setMuted(true); // Mute all sounds
```

## Mobile Considerations

On iOS and some Android browsers, AudioContext must be "unlocked" by a user gesture.
The bootstrap module handles this automatically by calling `ensureUserGestureResume()`
on the first click event.

## Testing

1. Open the app in a browser with developer console
2. Click a button → should hear `ui_click` (synth beep if no file)
3. Click a challenge node → should hear `node_select`
4. Open settings or shop → should hear `modal_open`
5. Close popup → should hear `modal_close`
6. Complete a challenge → should hear `challenge_complete`

To test with real audio:
1. Place `.wav` or `.ogg` files in `assets/sfx/`
2. Refresh the page (files are preloaded on startup)
3. Sounds will use the file instead of synth fallback

## Removing Audio

To disable audio completely:
1. Remove the `<script>` tag for `audioBootstrap.js` from `index.html`
2. Optionally delete `logic/audioManager.js` and `logic/audioBootstrap.js`

The app will function normally without audio.
