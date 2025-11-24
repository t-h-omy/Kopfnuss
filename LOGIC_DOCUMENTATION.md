# Kopfnuss Game Logic - Implementation Documentation

## Overview
This document describes the complete game logic implementation for Kopfnuss, a math learning PWA for 6th graders (ages 10-12).

## Architecture

### Module Structure
```
data/
  └── balancing.js         # Game configuration and balancing values

logic/
  ├── taskGenerators.js          # Generate math tasks
  ├── challengeGenerator.js      # Generate daily challenges
  ├── challengeStateManager.js   # Manage challenge states
  ├── taskFlow.js                # Task progression logic
  ├── streakManager.js           # Daily streak system
  ├── diamondManager.js          # Diamond rewards
  ├── storageManager.js          # localStorage wrapper
  └── taskScreenController.js    # UI controller for tasks
```

## Core Systems

### 1. Task Generation (`taskGenerators.js`)

Generates mathematical tasks based on balancing values:

- **Addition**: Two-digit numbers (10-99)
- **Subtraction**: Two-digit numbers, ensures positive results
- **Multiplication**: One factor 2-12, other 2-20
- **Division**: Ensures whole number results
- **Powers**: Powers of 2 (2^1 to 2^10)
- **Mixed**: Random selection from addition, subtraction, multiplication, division

```javascript
// Example usage
import { generateTask } from './logic/taskGenerators.js';
const task = generateTask('addition');
// Returns: { question: "45 + 67", answer: 112, metadata: {...} }
```

### 2. Challenge System (`challengeGenerator.js`, `challengeStateManager.js`)

#### Daily Challenges
- 5 challenges generated per day
- Each challenge has 10 tasks
- Challenges unlock sequentially
- Persist in localStorage by date

#### Challenge States
- `locked` - Not yet available
- `available` - Ready to start
- `in_progress` - Currently being played
- `completed` - Successfully finished
- `failed` - Abandoned or failed

```javascript
// Generate today's challenges
import { getTodaysChallenges } from './logic/challengeGenerator.js';
const challenges = getTodaysChallenges();

// Start a challenge
import { startChallenge } from './logic/challengeStateManager.js';
startChallenge(0); // Start first challenge
```

### 3. Task Flow (`taskFlow.js`, `taskScreenController.js`)

Manages progression through tasks within a challenge:

1. Initialize task flow for a challenge
2. Display current task
3. Validate user answer
4. Move to next task or complete challenge
5. Save results to localStorage

```javascript
// Initialize task flow
import { initializeTaskFlow, getCurrentTask, validateAnswer } from './logic/taskFlow.js';

initializeTaskFlow(0); // Challenge index 0
const task = getCurrentTask();
const result = validateAnswer(userInput);

if (result.isCorrect) {
  // Show success feedback
  nextTask();
}
```

### 4. Streak System (`streakManager.js`)

Tracks daily completion streaks:

- **Requirement**: Complete at least 10 tasks per day
- **Active**: Playing daily
- **Frozen**: Missed 1 day (can be rescued with diamond)
- **Lost**: Missed 2+ days (streak resets to 0)

```javascript
import { getStreakInfo, updateStreak, rescueStreak } from './logic/streakManager.js';

const info = getStreakInfo();
// {
//   currentStreak: 5,
//   longestStreak: 10,
//   status: 'active',
//   isFrozen: false,
//   tasksCompletedToday: 15,
//   tasksNeededForStreak: 0
// }

// Rescue a frozen streak
if (info.isFrozen && info.canRescue) {
  rescueStreak(); // Costs 1 diamond
}
```

### 5. Diamond System (`diamondManager.js`)

Reward system for completed tasks:

- **Earning**: 1 diamond per 100 tasks completed
- **Spending**: 1 diamond to rescue a frozen streak

```javascript
import { getDiamondInfo, updateDiamonds } from './logic/diamondManager.js';

updateDiamonds(); // Check for new diamonds to award
const info = getDiamondInfo();
// {
//   current: 3,
//   earned: 3,
//   spent: 0,
//   tasksUntilNext: 25,
//   progressToNext: 75
// }
```

### 6. Storage Management (`storageManager.js`)

All data persists in localStorage with error handling:

#### Storage Keys
- `kopfnuss_challenges_{YYYY-MM-DD}` - Daily challenges
- `kopfnuss_progress` - Overall progress
- `kopfnuss_streak` - Streak data
- `kopfnuss_diamonds` - Diamond count

#### Data Structures

**Progress**
```javascript
{
  totalTasksCompleted: 150,
  totalChallengesCompleted: 5,
  lastPlayedDate: '2025-11-24',
  tasksCompletedToday: 20
}
```

**Streak**
```javascript
{
  currentStreak: 5,
  longestStreak: 10,
  lastActiveDate: '2025-11-24',
  isFrozen: false
}
```

**Challenge**
```javascript
{
  id: 'challenge_0_addition',
  type: 'addition',
  name: 'Addition',
  icon: '➕',
  difficulty: 1,
  tasks: [...],
  state: 'available',
  errors: 0,
  currentTaskIndex: 0,
  completedAt: null,
  startedAt: null
}
```

## Routing & Navigation

The app uses a simple screen-based routing system:

```javascript
import { showScreen } from './main.js';

// Show challenges screen
showScreen('challenges');

// Show task screen for challenge index 0
showScreen('taskScreen', 0);

// Show stats screen
showScreen('stats');
```

## Game Flow

### Daily Session Flow
1. User opens app → Shows challenges screen
2. Displays streak info and diamond count
3. Shows 5 daily challenges (first unlocked, others locked)
4. User clicks available challenge → Task screen loads
5. User answers 10 tasks sequentially
6. After completion → Results displayed
7. Next challenge unlocks automatically
8. Returns to challenges screen

### Streak Logic
```
Day 1: Complete 10+ tasks → Streak = 1
Day 2: Complete 10+ tasks → Streak = 2
Day 3: Skip playing → Streak = 2 (frozen)
Day 4: Can rescue with diamond OR streak lost
```

## Error Handling

All modules include comprehensive error handling:

- localStorage operations wrapped in try-catch
- Invalid inputs validated before processing
- Missing data returns sensible defaults
- Console errors logged for debugging

## Testing

Test file: `test.html` (excluded from git)

Run tests:
1. Start local server: `python3 -m http.server 8000`
2. Open: `http://localhost:8000/test.html`
3. Click "Run All Tests"

All modules tested and verified:
- ✓ Task generation
- ✓ Challenge persistence
- ✓ Streak calculation
- ✓ Diamond awards
- ✓ Answer validation
- ✓ State management

## Configuration

Edit `data/balancing.js` to adjust:
- Task difficulty ranges
- Tasks per challenge (default: 10)
- Daily challenges count (default: 5)
- Tasks needed for streak (default: 10)
- Tasks per diamond (default: 100)
- Streak freeze/loss timing

## Future Enhancements

Possible additions (not implemented):
- Timer for tasks
- Hint system
- Achievement badges
- Leaderboard
- Sound effects
- Animations
- Tutorial mode
- Parent dashboard

## Important Notes

1. **All math operations return integers** - No decimal answers
2. **Date handling uses YYYY-MM-DD format** - Timezone-safe
3. **localStorage quota** - Monitor size, implement cleanup if needed
4. **Privacy mode** - localStorage may fail, handle gracefully
5. **Powers excluded from mixed mode** - Different difficulty level

## API Reference

See individual module files for detailed JSDoc comments on all exported functions.

## Maintenance

When modifying game logic:
1. Update balancing.js for difficulty changes
2. Maintain localStorage key prefixes
3. Keep error handling patterns
4. Update tests after changes
5. Verify backwards compatibility with saved data
