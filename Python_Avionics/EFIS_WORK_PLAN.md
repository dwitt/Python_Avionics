# EFIS Display Work Plan

Prioritized plan for completing unimplemented features, fixing bugs, and cleaning up the EFIS display codebase.

---

## Priority 1 — Bug Fixes & Correctness Issues

These are things that are actively wrong or broken in currently-running code.

### 1.1 Fix Vfe hardcoded value
- **File:** `support/airspeedRibbon.mjs:17`
- **Issue:** `vfe = 99` with `TODO: FIX, NOT CORRECT`. This affects airspeed color bands on the ribbon.
- **Action:** Set to the correct max flap extension speed for the aircraft.

### 1.2 Fix encoder position saving
- **File:** `support/userInput.mjs:106-107`
- **Issue:** "Saving the encoder position does not appear to be working. Needs debugging."
- **Action:** Debug encoder position initialization and persistence.

### 1.3 Fix VSI `createBackgroundGraphics()` stub
- **File:** `support/vsi-indicator.mjs:319-321`
- **Issue:** Creates a `Graphics` object but never draws into it and doesn't return it. Silently fails if called.
- **Action:** Implement the drawing logic or remove the dead method.

### 1.4 Fix VSI fontSize
- **File:** `support/vsi-indicator.mjs:220`
- **Issue:** Marked with `*** This seems incorrect`.
- **Action:** Verify and correct the font size value.

---

## Priority 2 — Re-enable Commented-Out Display Updates

These components are already instantiated and rendered, but their data updates are commented out in `DisplayUpdateLoop`. The data arrives from the server — it just isn't being piped into the displays.

### 2.1 Re-enable Speed Display updates
- **File:** `support/efis-display.js:375-380`
- **Data fields:** `gps_speed`, `static_pressure`, `differential_pressure`, `temperature`
- **Action:** Uncomment the property setters and `.update()` call.

### 2.2 Re-enable Altitude Display updates
- **File:** `support/efis-display.js:388-391`
- **Data fields:** `gps_altitude`, `static_pressure`, `temperature`
- **Action:** Uncomment the property setters and `.update()` call.

### 2.3 Re-enable Temp/Time Display updates
- **File:** `support/efis-display.js:382-386`
- **Data fields:** `temperature`, `tm_hour`, `tm_min`
- **Action:** Uncomment the property setters and `.update()` call. Also fix time formatting (`TODO: properly format the time` in `support/tempTimeDisplay.mjs:89`).

---

## Priority 3 — Re-enable Disabled Features

These modules are fully or mostly implemented but have their imports/instantiation commented out in `efis-display.js`.

### 3.1 Slip/Skid Ball Indicator
- **File:** `support/slipBall.mjs`
- **Status:** Complete implementation. Import commented at line 25, update logic commented at lines 369-371.
- **Action:** Uncomment import, instantiation, and update loop calls. This is a standard PFD instrument and high value.

### 3.2 Altimeter Ribbon as user-input target
- **File:** `support/efis-display.js:341`
- **Status:** Callback registration is commented out.
- **Action:** Re-enable to allow user adjustment of baro settings via the altimeter ribbon.

---

## Priority 4 — Complete Stub Implementations

### 4.1 `MagnetometerCalibrate.scalePoint()`
- **File:** `support/magnetometerCalibrate.mjs:40-42`
- **Issue:** Method body is completely empty.
- **Action:** Implement scaling logic before magnetometer calibration feature can work.

### 4.2 Heading Indicator hardcoded values
- **File:** `support/headingIndicator.mjs:170`
- **Issue:** `pixelsPerTenDegrees` is hardcoded instead of being relative to screen width. Multiple TODOs at lines 579-655 about state management and visual indicators.
- **Action:** Make values dynamic based on screen dimensions; address state management TODOs.

### 4.3 Ribbon placeholder
- **File:** `support/ribbon.mjs:268`
- **Issue:** `TODO: Place holder for now` for bug/changeable graphics positioning.
- **Action:** Implement proper positioning logic.

---

## Priority 5 — Code Cleanup

### 5.1 Delete the second canvas (`app2`)
- **File:** `support/efis-display.js:81-95`
- **Issue:** Creates an unused second PixiJS application. Comment says `TODO: Delete this section`.
- **Action:** Remove the second canvas creation and DOM append.

### 5.2 Clarify/remove `dataObject` initialization
- **File:** `support/efis-display.js:102`
- **Issue:** Marked `TODO: Not sure if this can be deleted`.
- **Action:** Determine if this initialization is needed; remove if not.

### 5.3 Clean up old PixiJS v7 commented code
- **Files:** Multiple support modules
- **Issue:** Blocks of commented-out PIXI v7 API syntax left over from the v8 migration.
- **Action:** Remove all obsolete v7 code comments.

---

## Priority 6 — Future Features

These are more significant feature additions that require design decisions.

### 6.1 Menu / Interaction system
- **File:** `support/interaction.mjs`
- **Status:** Import commented out. Provides UI menu functionality.
- **Action:** Decide what menu options to expose, then enable.

### 6.2 EGT/CHT Temperature Graphs
- **File:** `support/temperatureGraph.mjs`
- **Status:** Import commented out. Has its own TODO about temporary box drawing.
- **Action:** Requires a layout decision (second canvas or redesigned single-canvas layout) and actual engine data from CAN bus.

### 6.3 Soft Buttons
- **File:** `support/softButtons.mjs`
- **Status:** Import commented out. Depends on other features being enabled first.
- **Action:** Enable after prerequisite features are in place.

### 6.4 Numeric Wheel Display
- **File:** `support/numericWheelDisplay.mjs`
- **Status:** Import commented out. Alternative odometer-style numeric display.
- **Action:** Evaluate as replacement or supplement to current numeric displays.

---

## Server-Side Items

### S.1 GPS significant digits
- **File:** `aio_server.py:646`
- **Issue:** `TODO: Check if enough significant digits for GPS lat/long`.
- **Action:** Verify precision of GPS coordinate formatting in `process_gps1_message`.

### S.2 Logging
- **Issue:** Print statements used instead of `logging` module. Logging configuration referenced in setup docs but marked as TODO.
- **Action:** Replace print statements with structured logging; complete logging setup.

---

## Suggested Approach

1. **Priorities 1-2** are quick wins — fixing bugs in active code and uncommenting display updates that are already wired up.
2. **Priority 3** (slip ball) gives a new instrument with minimal effort since the code is already written.
3. **Priority 5** cleanup reduces confusion when working on the codebase going forward.
4. **Priorities 4 and 6** are larger efforts that benefit from the earlier cleanup work.
