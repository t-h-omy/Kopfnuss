# Data README
Dieser Ordner enthält Datenmodelle und Konfiguration für die Kopfnuss App.

## Module

### balancing.js
Spielbalancing und Konfiguration.

**BALANCING** - Zahlenbereiche für jede Rechenart
- `addition`: min/max Werte für Additionsaufgaben
  - Applied in: logic/taskGenerators.js - generateAdditionTask()
- `subtraction`: min/max Werte für Subtraktionsaufgaben
  - Applied in: logic/taskGenerators.js - generateSubtractionTask()
- `multiplication`: Faktorbereiche für Multiplikation
  - Applied in: logic/taskGenerators.js - generateMultiplicationTask()
- `division`: Divisor/Quotient-Bereiche für Division
  - Applied in: logic/taskGenerators.js - generateDivisionTask()
- `squared`: min/max für Quadratzahlen
  - Applied in: logic/taskGenerators.js - generateSquaredTask()

**CONFIG** - Spielkonfiguration
- `TASKS_PER_CHALLENGE`: Aufgaben pro Challenge-Session
  - Applied in: logic/challengeGenerator.js, logic/taskFlow.js
- `DAILY_CHALLENGES`: Anzahl der Challenge-Nodes pro Tag
  - Applied in: logic/challengeGenerator.js
- `TASKS_FOR_STREAK`: Aufgaben für Streak-Erhalt
  - Applied in: logic/streakManager.js
- `TASKS_PER_DIAMOND`: Aufgaben pro Diamant
  - Applied in: logic/diamondManager.js, main.js
- `STREAK_RESCUE_COST`: Diamanten-Kosten für Streak-Rettung
  - Applied in: main.js, logic/streakManager.js
- `FREEZE_AFTER_DAYS`: Tage bis Streak einfriert
  - Applied in: logic/streakManager.js
- `LOSE_AFTER_DAYS`: Tage bis Streak verloren
  - Applied in: logic/streakManager.js

**CHALLENGE_TYPES** - Challenge-Typ-Definitionen
- Applied in: logic/challengeGenerator.js

### constants.js
Anwendungskonstanten für Animationen und visuelle Effekte.

**ANIMATION_TIMING** - Zeitkonstanten für Animationen
- Applied in: main.js, logic/visualEffects.js, logic/taskScreenController.js

**SPARKLE_CONFIG** - Sparkle-Effekt-Konfiguration
- Applied in: logic/visualEffects.js - createSparkles()

**CONFETTI_CONFIG** - Konfetti-Effekt-Konfiguration
- Applied in: logic/popupManager.js - createConfettiEffect()

**RESIZE_CONFIG** - Resize-Verhalten-Konfiguration
- Applied in: main.js - window resize handler

**VISUAL_CONFIG** - Visuelle Effekte und Hintergründe
- `CELEBRATION_GRAPHIC_SIZE`: Größe der Feier-Grafik
  - Applied in: main.js - loadChallengesScreen()
- `BACKGROUND_OPACITY`: Transparenz des App-Hintergrunds
  - Applied in: main.js → CSS variable --background-opacity
  - Affects: style.css - .challenges-container::before, .task-screen::before

## LocalStorage Datenstrukturen
Verwaltet durch logic/storageManager.js:
- `kopfnuss_challenges_YYYY-MM-DD`: Tägliche Challenges
- `kopfnuss_progress`: Gesamtfortschritt
- `kopfnuss_streak`: Streak-Daten
- `kopfnuss_diamonds`: Diamanten-Anzahl
