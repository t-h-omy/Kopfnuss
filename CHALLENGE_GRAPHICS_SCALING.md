# Challenge Graphics Scaling Guide

This guide explains how to balance the visual scale of challenge node graphics (ray effects and celebration backgrounds) in Kopfnuss.

## Overview

Challenge nodes display two main visual effects:
1. **Ray Effect (Splash)**: The comic-style burst rays emanating from behind the challenge node
2. **Celebration Graphic**: The decorative background image that appears when a challenge is completed

Both effects share the same scale value for each challenge type, making it simple to maintain consistent visual proportions.

## Scale Values Location

All scale values are defined in `/data/constants.js` within the `VISUAL_CONFIG` object:

```javascript
export const VISUAL_CONFIG = {
  // ... other config ...
  
  STANDARD_CHALLENGE_SCALE: 175,   // For standard challenge nodes
  SUPER_CHALLENGE_SCALE: 200,      // For super challenge nodes  
  PREMIUM_CHALLENGE_SCALE: 200     // For Zeit-Challenge and Kopfnuss premium challenges
};
```

## Scale Value Meaning

Each scale value (in pixels) controls:
- **Container size**: The overall size of the ray effect and celebration graphic
- **Ray length**: Automatically calculated as `scale / 5` to maintain proper proportions
- **Celebration background**: Uses the same size as the ray effect container

## Recommended Ranges

| Challenge Type | Scale Value | Recommended Range | Notes |
|---------------|-------------|-------------------|-------|
| **Standard** | 175 | 150-200 | Should be smallest to distinguish from premium challenges |
| **Super** | 200 | 175-225 | Should be larger to emphasize importance |
| **Premium** | 200 | 175-225 | Zeit-Challenge and Kopfnuss should match Super challenges |

## How to Balance

### 1. Visual Hierarchy Goals
- **Standard challenges** should have the smallest graphics (they're the most common)
- **Super challenges** should be visually prominent (they unlock after completing all standard challenges)
- **Premium challenges** (Zeit-Challenge, Kopfnuss) should match or slightly exceed Super challenges

### 2. Balancing Process

1. **Start with the default values** (175 for standard, 200 for super/premium)

2. **Test on different screen sizes**:
   - Mobile phones (320-428px width)
   - Tablets (768-1024px width)
   - Desktop browsers (1280px+ width)

3. **Check visual balance**:
   - Ray effects should not overlap adjacent elements
   - Celebration graphics should be clearly visible but not overwhelming
   - The challenge node icon should remain the focal point

4. **Adjust incrementally**:
   - Make changes in increments of 10-25 pixels
   - Test after each change
   - Ensure all three types maintain a logical visual hierarchy

### 3. Common Adjustments

**If graphics are too large:**
- Reduce all three values proportionally (e.g., subtract 25 from each)
- Example: `STANDARD_CHALLENGE_SCALE: 150`, `SUPER_CHALLENGE_SCALE: 175`, `PREMIUM_CHALLENGE_SCALE: 175`

**If graphics are too small:**
- Increase all three values proportionally (e.g., add 25 to each)
- Example: `STANDARD_CHALLENGE_SCALE: 200`, `SUPER_CHALLENGE_SCALE: 225`, `PREMIUM_CHALLENGE_SCALE: 225`

**To emphasize super/premium challenges more:**
- Keep standard the same, increase super/premium
- Example: `STANDARD_CHALLENGE_SCALE: 175`, `SUPER_CHALLENGE_SCALE: 225`, `PREMIUM_CHALLENGE_SCALE: 225`

**To make all challenges similar size:**
- Set all three values close together
- Example: `STANDARD_CHALLENGE_SCALE: 180`, `SUPER_CHALLENGE_SCALE: 190`, `PREMIUM_CHALLENGE_SCALE: 190`

## Testing Your Changes

After modifying scale values in `constants.js`:

1. **Refresh the app** (hard refresh with Ctrl+Shift+R or Cmd+Shift+R)

2. **Check these scenarios**:
   - [ ] Standard challenges with ray effects visible
   - [ ] Completed standard challenges with celebration graphics
   - [ ] Super challenges with ray effects (larger than standard)
   - [ ] Completed super challenges with celebration graphics
   - [ ] Zeit-Challenge node with ray effects
   - [ ] Completed Zeit-Challenge with celebration graphic
   - [ ] Kopfnuss challenge node with ray effects
   - [ ] Completed Kopfnuss challenge with celebration graphic

3. **Verify on mobile** (use browser DevTools device emulation or real device)

4. **Check animations**:
   - Complete a challenge and ensure the celebration graphic animates smoothly
   - Ray effects should not cause layout shifts

## Technical Details

### How Scale Values Are Used

**In main.js for standard/super challenges:**
```javascript
const scale = isSuperChallenge 
  ? VISUAL_CONFIG.SUPER_CHALLENGE_SCALE 
  : VISUAL_CONFIG.STANDARD_CHALLENGE_SCALE;
const baseLength = Math.round(scale / 5); // Ray length
const containerSize = scale; // Container size
```

**In main.js for premium challenges (Zeit-Challenge, Kopfnuss):**
```javascript
generateSplashRaysHtml('zeit-splash challenge-splash', VISUAL_CONFIG.PREMIUM_CHALLENGE_SCALE);
const bgSize = VISUAL_CONFIG.PREMIUM_CHALLENGE_SCALE;
```

### CSS Considerations

The scale values work in conjunction with CSS classes:
- `.challenge-splash` - Container for ray effects
- `.splash-ray` - Individual ray elements
- `.challenge-bg-graphic` - Container for celebration graphics
- `.challenge-bg-animate` - Animation class for celebration graphics

No CSS changes are needed when adjusting scale values - all sizing is controlled via inline styles set from the JavaScript constants.

## Troubleshooting

**Graphics overlap with other elements:**
- Reduce the scale values by 10-25 pixels
- Check that CSS positioning hasn't changed in `style.css`

**Graphics are too small to see clearly:**
- Increase the scale values by 10-25 pixels
- Verify the images in `/assets/celebration/` are high quality

**Ray effects look disproportionate:**
- The ray length is automatically calculated as `scale / 5`
- Adjust the multiplier in `main.js` if needed (search for `scale / 5`)

**Celebration graphics don't animate:**
- This is unrelated to scale values
- Check `VISUAL_CONFIG.CELEBRATION_ANIMATION_DELAY` in `constants.js`
- Verify CSS animation class `.challenge-bg-animate` in `style.css`

## Version History

- **v1.24.7** (2025-12-03): Simplified scaling system with three independent scale values
  - Replaced old `SPLASH_SIZE_*` and `CELEBRATION_GRAPHIC_MULTIPLIER` approach
  - Now using direct scale values: `STANDARD_CHALLENGE_SCALE`, `SUPER_CHALLENGE_SCALE`, `PREMIUM_CHALLENGE_SCALE`
  - Each scale value controls both ray effect and celebration graphic for better consistency
