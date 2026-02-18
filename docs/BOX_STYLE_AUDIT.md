# EFIS Box & Rectangle Style Audit

All Graphics-based boxes used as backgrounds or containers for text/UI elements.

## Current State

### Instrument Readout Boxes

These are small boxes displaying digital values on instruments.

| File | Line | Purpose | Radius | Fill | Fill Alpha | Stroke Color | Stroke Width | Stroke Align | Dimensions |
|------|------|---------|--------|------|------------|-------------|-------------|-------------|------------|
| displayRectangle.mjs | 215 | Display box (normal) | variable | `0x000000` | 25% | `0xffffff` white | 1px | 1 (inside) | variable |
| displayRectangle.mjs | 238 | Display box (selected) | variable | `0x000000` | 25% | `0xff0000` red | 2px | 0.5 (middle) | variable |
| displayRectangle.mjs | 257 | Display box (editing) | variable | `0x000000` | 100% | `0x00ffff` cyan | 2px | 0.5 (middle) | variable |
| headingIndicator.mjs | 547 | Heading bug value box | 5px | `0x000000` | 100% | `0x00ffff` cyan | 2px | 0 (outside) | 40x25 |
| hsi.mjs | 184 | HSI heading readout | 4px | `0x000000` | 100% | `0x666666` grey | 1.5px | default | 70x36 |
| hsi.mjs | 295 | HSI bug readout | 4px | `0x222222` | 95% | `0x00ffff` cyan | 1.5px | default | 50x26 |

### Menu & Button Boxes

| File | Line | Purpose | Radius | Fill | Fill Alpha | Stroke Color | Stroke Width | Stroke Align | Dimensions |
|------|------|---------|--------|------|------------|-------------|-------------|-------------|------------|
| menuOverlay.mjs | 55 | Menu box background | 8px | `0x222222` | 95% | `0x666666` grey | 2px | 1 (inside) | 400 x var |
| menuOverlay.mjs | 105 | Toggle row | 4px | `0x333333` | 90% | none | — | — | 380 x 44 |
| menuOverlay.mjs | 155 | Close row | 4px | `0x333333` | 90% | none | — | — | 380 x 44 |
| softButtons.mjs | 67 | Menu button | 4px | `0x333333` | 70% | `0x666666` grey | 1px | 1 (inside) | var |

### Instrument Backgrounds

These are larger background rectangles for instrument areas.

| File | Line | Purpose | Shape | Fill | Fill Alpha | Stroke Color | Stroke Width | Stroke Align |
|------|------|---------|-------|------|------------|-------------|-------------|-------------|
| ribbon.mjs | 115 | Ribbon background | rect | `0x000000` | 25% | `0x000000` | 1px | 0 |
| headingIndicator.mjs | 127 | Heading ribbon bg | rect | `0x0000C0` | 100% | `0x000000` | 1px | 0 |
| headingIndicator.mjs | 137 | Heading ribbon overlay | rect | `0x000000` | 25% | none | — | — |
| vsi-indicator.mjs | 66 | VSI background | rect | `0x000000` | 25% | `0x000000` | 1px | 1 |
| attitude-indicator.mjs | 251 | Sky rectangle | rect | `0x0000C0` | 100% | none | — | — |
| attitude-indicator.mjs | 256 | Earth rectangle | rect | `0x884400` | 100% | none | — | — |
| slipBall.mjs | 47 | Slip tube background | roundRect | tubeRadius | `0x000000` | 25% | none | — |
| slipBall.mjs | 52 | Slip tube edge shadow | roundRect | tubeRadius | none | — | `0x333333` | 1.5px |
| slipBall.mjs | 57 | Slip tube highlight | roundRect | tubeRadius-1 | none | — | `0x444444` | 1px |

### Overlay Backgrounds

| File | Line | Purpose | Shape | Fill | Fill Alpha |
|------|------|---------|-------|------|------------|
| menuOverlay.mjs | 37 | Full-screen dimmer | rect | `0x000000` | 85% |

---

## Issues

1. **Corner radius** — 4px, 5px, and 8px used for similar roles
2. **Stroke width** — 1px, 1.5px, and 2px with no clear pattern; 1.5px is fractional and should be avoided on integer-pixel hardware
3. **Fill color** — `0x000000`, `0x222222`, `0x333333` mixed for similar box types
4. **Fill alpha** — 25%, 70%, 85%, 90%, 95%, 100% with no clear system
5. **Stroke alignment** — 0 (outside), 0.5 (middle), 1 (inside), and default all used
6. **HSI inconsistency** — heading box uses `0x000000` fill but bug box uses `0x222222`

---

## Proposed Standard

### Instrument Readout Boxes (small value displays)

| Property | Standard | Notes |
|----------|----------|-------|
| Shape | roundRect | All readout boxes |
| Corner radius | **4px** | Drop the 5px outlier in headingIndicator |
| Fill color | `0x000000` black | Solid black background |
| Fill alpha | **100%** | Opaque — readout text must be clearly legible |
| Stroke color (normal) | `0x666666` grey | Neutral border |
| Stroke color (selected) | `0xff0000` red | Selection highlight |
| Stroke color (editing) | `0x00ffff` cyan | Active editing highlight |
| Stroke width (normal) | **2px** | Integer pixels only — clean rendering on hardware |
| Stroke width (selected/editing) | **2px** | Same width, color change distinguishes state |
| Stroke alignment | **1** (inside) | Prevents border bleeding outside bounds |

### Menu & Button Boxes

| Property | Standard | Notes |
|----------|----------|-------|
| Shape | roundRect | All interactive elements |
| Corner radius | **4px** for buttons/rows, **8px** for large panels | Menu panel is the only 8px |
| Fill color (panel) | `0x222222` | Slightly visible against black |
| Fill color (rows/buttons) | `0x333333` | Lighter for interactive rows |
| Fill alpha (panel) | **95%** | Near opaque |
| Fill alpha (rows/buttons) | **90%** | Consistent for all interactive rows |
| Stroke color | `0x666666` grey | Borders on panels and buttons |
| Stroke width | **2px** | Integer pixels, matches instrument boxes |
| Stroke alignment | **1** (inside) | Consistent with instruments |

### Instrument Backgrounds (large areas)

| Property | Standard | Notes |
|----------|----------|-------|
| Shape | rect | No rounded corners on full backgrounds |
| Fill alpha | **25%** for overlays on other content | Semi-transparent |
| Stroke | `0x000000` 1px or none | Minimal border |

---

## Proposed Changes

Changes to align with the standard. No-change items omitted.

| File | Line | Property | Current | Proposed | Reason |
|------|------|----------|---------|----------|--------|
| headingIndicator.mjs | 547 | radius | 5px | 4px | Standardize to 4px |
| headingIndicator.mjs | 547 | stroke align | 0 (outside) | 1 (inside) | Standardize alignment |
| hsi.mjs | 295 | fill | `0x222222` 95% | `0x000000` 100% | Match instrument readout standard |
| hsi.mjs | 184 | stroke width | 1.5px | 2px | Standardize to integer pixels |
| hsi.mjs | 295 | stroke width | 1.5px | 2px | Standardize to integer pixels |
| softButtons.mjs | 67 | fill alpha | 70% | 90% | Standardize interactive row alpha |
| softButtons.mjs | 67 | stroke width | 1px | 2px | Standardize border width |
| displayRectangle.mjs | 215 | fill alpha | 25% | 100% | Solid black for readability |
| displayRectangle.mjs | 215 | stroke width | 1px | 2px | Standardize border width |
| displayRectangle.mjs | 215 | stroke align | 1 | 1 | Already correct |
| displayRectangle.mjs | 238 | stroke align | 0.5 | 1 | Standardize alignment |
| displayRectangle.mjs | 257 | stroke align | 0.5 | 1 | Standardize alignment |
| slipBall.mjs | 52 | stroke width | 1.5px | 2px | Integer pixels only |
