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

### Priority SFX List

| Name | Description | Trigger |
|------|-------------|---------|
| `ui_click` | Button click sound | Any button or interactive element click |
| `node_select` | Challenge node selection | Clicking on challenge/kopfnuss/zeit nodes |
| `answer_correct` | Correct answer feedback | Submitting correct answer in task |
| `answer_incorrect` | Wrong answer feedback | Submitting wrong answer in task |
| `success_fanfare` | Celebration sound | Completing challenges, reward popup |
| `confetti_pop` | Confetti effect sound | When confetti appears |
| `diamond_gain` | Earning diamonds | Diamond celebration popup |
| `streak_gain` | Streak milestone | Streak celebration popup |
| `modal_open` | Popup opening | Any popup/modal opening |
| `modal_close` | Popup closing | Any popup/modal closing |
| `not_enough_diamonds_hint` | Insufficient funds | Trying to buy without enough diamonds |
| `countdown_tick` | Timer tick | Zeit-Challenge countdown |
| `low_time_warning` | Low time alert | Zeit-Challenge when time is low |

### File Naming

Files should be named: `<name>.wav` or `<name>.ogg`

Examples:
- `assets/sfx/ui_click.wav`
- `assets/sfx/success_fanfare.ogg`

The system tries `.wav` first, then `.ogg` if not found.

## Synthesized Fallbacks

When audio files are missing, the system plays synthesized beeps using the Web Audio API.
Each sound has preset parameters (frequency, duration, waveform type) defined in `audioManager.js`.

Fallback sounds are:
- Pleasant and non-intrusive
- Short duration (typically < 200ms)
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
import { playAnswerFeedback, playConfettiPop } from './logic/audioBootstrap.js';

// In answer submission handler
playAnswerFeedback(isCorrect); // true = correct sound, false = incorrect

// When showing confetti
playConfettiPop();
```

Or access the audioManager directly:

```javascript
import { audioManager } from './logic/audioManager.js';

audioManager.play('success_fanfare');
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
6. Complete a challenge → should hear `success_fanfare`

To test with real audio:
1. Place `.wav` or `.ogg` files in `assets/sfx/`
2. Refresh the page (files are preloaded on startup)
3. Sounds will use the file instead of synth fallback

## Removing Audio

To disable audio completely:
1. Remove the `<script>` tag for `audioBootstrap.js` from `index.html`
2. Optionally delete `logic/audioManager.js` and `logic/audioBootstrap.js`

The app will function normally without audio.
