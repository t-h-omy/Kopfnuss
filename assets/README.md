# Assets README
Dieser Ordner enthält alle statischen Assets für die Kopfnuss PWA

## Aktueller Status
✅ **App Icons sind verfügbar** für verschiedene Plattformen und Bildschirmgrößen.

## Vorhandene Assets:

### iOS Icons
- ios_60.png (60x60) - iPhone @1x
- ios_120.png (120x120) - iPhone @2x
- ios_180.png (180x180) - iPhone @3x

### iPad Icons
- ipad_76.png (76x76) - iPad @1x
- ipad_152.png (152x152) - iPad @2x
- ipad_pro_167.png (167x167) - iPad Pro

### Android Icons
- android_192.png (192x192) - Standard Android Icon
- android_512.png (512x512) - High-res Android Icon

### Desktop Icons
- desktop_256.png (256x256) - Standard Desktop
- desktop_512.png (512x512) - High-res Desktop

### Challenge Node Backgrounds (512×512 WebP)
Displayed behind completed challenge nodes on the challenges screen.
- challenge-node-bg-1.webp
- challenge-node-bg-2.webp
- challenge-node-bg-3.webp
- challenge-node-bg-4.webp
- challenge-node-bg-5.webp

Applied in: main.js - loadChallengesScreen()

### App Background
- background_compressed.webp (1024x1536) - Fullscreen background image

Applied in: style.css - .challenges-container::before, .task-screen::before
Opacity controlled by: data/constants.js - VISUAL_CONFIG.BACKGROUND_OPACITY

### UI Icons (planned)
- diamond.svg (Diamant-Icon)
- streak-fire.svg (Streak-Icon)
- challenge-icons/ (Icons für verschiedene Challenge-Typen)
  - addition.svg
  - subtraction.svg
  - multiplication.svg
  - division.svg
  - powers.svg

### Bilder (planned)
- splash-screen.png (PWA Splash Screen)
- logo.svg (App Logo)

### Sounds (optional, planned)
- correct.mp3 (Richtige Antwort)
- wrong.mp3 (Falsche Antwort)
- achievement.mp3 (Streak erreicht)
