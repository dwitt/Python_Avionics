# HSI Display Implementation Plan

## Overview

Add a Horizontal Situation Indicator (HSI) to the second canvas (app2), which currently sits below (portrait) or beside (landscape) the main EFIS display. The HSI combines heading awareness with navigation guidance in a single round instrument.

## Current State

### app2 Canvas
- Already exists in efis-display.js (lines 84-100)
- Same dimensions as the main EFIS canvas (half screen)
- Appended to DOM after the main canvas
- Currently empty — marked as a test canvas with TODO to delete
- Will repurpose as the HSI/navigation display canvas

### Available Data Sources

| Data Field         | Source        | Status           | Use in HSI                  |
|--------------------|---------------|------------------|-----------------------------|
| `yaw`              | AHRS (CAN 0x48) | Active, 20 Hz | Aircraft magnetic heading   |
| `true_track`       | GPS (CAN 0x64)  | Available, not wired to JS | Ground track over ground |
| `gps_speed`        | GPS (CAN 0x64)  | Available, not wired to JS | Ground speed readout     |
| `latitude`         | GPS (CAN 0x63)  | Available, not wired to JS | Future: waypoint nav     |
| `longitude`        | GPS (CAN 0x63)  | Available, not wired to JS | Future: waypoint nav     |
| VOR/LOC course     | —             | Not available    | Future: external nav radio  |
| CDI deviation      | —             | Not available    | Future: external nav radio  |
| Glideslope         | —             | Not available    | Future: ILS approaches      |
| Waypoint bearing   | —             | Not available    | Future: GPS navigator       |

### What We Can Build Now vs Later

**Phase 1 (Now):**
- Rotating compass rose driven by AHRS heading (`yaw`)
- Ground track indicator driven by GPS (`true_track`)
- Heading bug (user-adjustable via rotary encoder)
- Aircraft symbol at centre
- Digital heading readout
- Ground speed readout

**Phase 2 (When nav data becomes available):**
- Course pointer arrow (set by pilot or nav source)
- Course Deviation Indicator (CDI) bar with dot scale
- TO/FROM indicator triangles
- Bearing pointer needle
- Nav source annunciation (GPS/VOR/LOC with colour coding)

**Phase 3 (Future):**
- Glideslope indicator (ILS approaches)
- Arc mode (90° forward view)
- Wind vector display
- Distance/waypoint readouts

## Visual Design

### Layout in app2
```
┌─────────────────────────────────┐
│                                 │
│         ┌─ HDG 275 ─┐          │  ← Digital heading readout
│        /              \         │
│       /    N           \        │
│      │  W    ✈    E     │       │  ← Rotating compass rose
│       \    S           /        │     with fixed aircraft symbol
│        \              /         │
│         └────────────┘          │
│           GS: 95 kts           │  ← Ground speed readout
│                                 │
└─────────────────────────────────┘
```

### Compass Rose (Phase 1 Core)
- **Shape:** Full 360° circular compass card
- **Size:** Diameter should be approximately 80% of the smaller canvas dimension
- **Rotation:** Rotates so current heading is always at the top (heading-up)
- **Tick marks:**
  - Major ticks every 10° — extend inward ~12px
  - Medium ticks every 5° — extend inward ~8px
  - Minor ticks every 1° — extend inward ~4px (optional, may be too dense)
- **Labels:** Every 30° (N, 3, 6, E, 12, 15, S, 21, 24, W, 30, 33)
  - Cardinal letters (N/S/E/W) in white
  - Numbers in grey/white
  - Font: Tahoma, sized to fit within the rose
- **Colour:** White/light grey ticks and text on dark background

### Fixed Elements (Don't Rotate)
- **Lubber line:** White triangle or line at top (12 o'clock) marking current heading
- **Aircraft symbol:** Small fixed white triangle/airplane icon at centre
- **Heading readout:** Digital heading value in a box above the rose

### Ground Track Indicator (Phase 1)
- **Style:** Small magenta diamond or triangle on the compass rose edge
- **Driven by:** `true_track` from GPS
- **Shows:** Direction of travel over the ground vs where the nose is pointing

### Heading Bug (Phase 1)
- **Style:** Cyan filled triangle/marker on the outer edge of the compass rose
- **Adjustable:** Via rotary encoder (same callback pattern as existing heading bug)
- **Digital readout:** Small cyan number showing selected heading

### Course Pointer & CDI (Phase 2 — Placeholder Structure)
- **Course pointer:** Magenta (GPS) or green (VOR/LOC) arrow through centre
- **CDI bar:** Slides perpendicular to course pointer, centred = on course
- **Deviation dots:** 2 dots each side of centre, full scale = 2° GPS or 10° VOR
- **TO/FROM:** Small triangle near centre pointing toward/away from source

## Architecture

### New Files
- `support/hsi.mjs` — Main HSI class

### Module Structure
```
class HSI {
    constructor(app, x, y, diameter)

    // Properties
    heading         — AHRS magnetic heading (rotates the rose)
    groundTrack     — GPS track over ground (positions track indicator)
    headingBug      — Selected heading (positions bug on rose)

    // Phase 2 properties (stubbed)
    course          — Selected course for CDI
    courseDeviation  — Lateral deviation from course
    toFrom          — TO/FROM flag
    navSource       — 'GPS', 'VOR', 'LOC'
    bearing         — Bearing to station/waypoint

    // Methods
    update()        — Called each frame to redraw dynamic elements
    callback()      — Rotary encoder interface (same pattern as other instruments)

    // Internal
    _createCompassRose()    — Build the rotating compass card (ticks, labels)
    _createFixedElements()  — Lubber line, aircraft symbol, heading box
    _createTrackIndicator() — Ground track diamond
    _createHeadingBug()     — Heading bug marker
    _updateRotation()       — Rotate rose container to current heading
}
```

### Integration with efis-display.js

1. **Import:** `import { HSI } from './hsi.mjs';`
2. **Create in setup():**
   ```javascript
   hsi = new HSI(app2, app2.screen.width / 2, app2.screen.height / 2, diameter);
   ```
3. **Wire data in DisplayUpdateLoop():**
   ```javascript
   hsi.heading = dataObject.yaw;
   hsi.groundTrack = dataObject.true_track;
   hsi.update();
   ```
4. **Wire `true_track` and `gps_speed`** — These fields exist in the JSON but are currently not used in JS. Just start reading them from `dataObject`.
5. **Register callback** for heading bug adjustment via rotary encoder.

### Rendering Approach
- **Compass rose:** Pre-rendered as a PixiJS Container with all ticks and labels as children. Rotate the entire container each frame (`roseContainer.rotation = -heading * Math.PI / 180`).
- **Fixed overlay:** Separate Container that does NOT rotate (lubber line, aircraft symbol, heading readout, ground speed text).
- **Circular mask:** Apply a circular mask to clip the compass rose to a clean circle.
- **Dynamic elements:** Heading bug and track indicator are children of the rotating rose container (so they rotate with it), but their angular positions are set relative to their target values.

## Considerations

### Performance
- Rotating a container with ~100 children (ticks + labels) is efficient in PixiJS — it's a single transform on the GPU.
- Only the digital readouts and bug positions need updating each frame. The rose geometry is static after construction.

### Sizing
- The canvas dimensions depend on the Pi's screen. With the 50/50 split, each canvas gets roughly 400-540px in the smaller dimension.
- A diameter of ~320-400px would work well, leaving room for readouts above and below.
- Should be calculated dynamically from canvas size.

### Rotary Encoder Integration
- The HSI heading bug should register as a callback with the existing UserInput system, same as the altitude bug and heading bug on the main display.
- Need to consider whether to share the same encoder or have a separate input for app2.

### Data Pipeline
- `true_track` is already being sent in the JSON (`data.__dict__` sends all fields). The JS side just needs to start reading `dataObject.true_track`.
- No Python or Arduino changes needed for Phase 1.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `support/hsi.mjs` | CREATE | New HSI display module |
| `support/efis-display.js` | MODIFY | Import HSI, create in app2, wire data |
| `supportfilelist.txt` | MODIFY | Add hsi.mjs |

## Open Questions

1. **Diameter:** What size should the compass rose be relative to the canvas? Start at 80% of the smaller dimension?
2. **Heading bug interaction:** Should the HSI heading bug be linked to the existing heading indicator's bug, or independent?
3. **Background:** Should app2 have a solid black background, or match the dark grey of the main EFIS?
4. **Ground speed placement:** Below the rose? In a corner?
5. **Phase 2 trigger:** What navigation hardware will provide course/CDI data? (GPS navigator, VOR receiver, or software-calculated from waypoints?)
