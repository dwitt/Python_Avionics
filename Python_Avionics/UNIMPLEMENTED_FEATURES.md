# Unimplemented or Incomplete Features

Overview of modules and features that are present in the project but not fully implemented or wired up. Generated for reference.

---

## 1. Commented-Out / Disabled Features (EFIS Display)

These modules exist and are functional (or partially so) but are **not currently used** in the main display because their imports or instantiation are commented out in `support/efis-display.js`.

| Feature | File | Status |
|---------|------|--------|
| **Soft buttons** | `support/softButtons.mjs` | Import and instantiation commented out (depends on magnetometer calibrate). |

---

## 2. Test / Dead Code

### Second canvas (`app2`)

- **Location:** `support/efis-display.js` (lines ~78–94)
- **Status:** A second PixiJS `Application` is created and its canvas appended to the document. Comment says *"TODO: Delete this section"*.
- **Impact:** Renders an extra (blank/black) canvas; was intended for EMS (EGT/CHT) which is commented out.

---

## 3. Stub or Incomplete Implementations

### VSI indicator – `createBackgroundGraphics(height, width)`

- **File:** `support/vsi-indicator.mjs`
- **Issue:** Creates a `Graphics` object but never draws into it and **does not return it**. Effectively a no-op stub.

---

## 4. Data Present But Not Wired to Display

The server sends these in JSON, but the corresponding display updates are **commented out** in `DisplayUpdateLoop` in `efis-display.js`:

| Data | Display component | What’s commented |
|------|--------------------|-------------------|
| `temperature`, `tm_hour`, `tm_min` | `tempTimeDisplay` | Setter assignments and `update()` call |
| `gps_speed`, `static_pressure`, `differential_pressure`, `temperature` | `speedDisplay` | Property updates and `update()` call |
| `gps_altitude`, `static_pressure`, `temperature` | `altitudeDisplay` | Property updates and `update()` call |
| `magx`, `magy`, `magz` | `magnetometerCalibrate` | `plotPoint(...)` call — module archived in `support/unused/` |

---

## 5. TODOs and Known Issues in Code

| Location | Description |
|----------|-------------|
| **aio_server.py** (~646) | TODO: Check if enough significant digits for GPS lat/long in `process_gps1_message`. |
| **support/airspeedRibbon.mjs** | `vfe = 99` with "TODO: FIX, NOT CORRECT" — Vfe (max flap extension speed) is hardcoded. |
| **support/userInput.mjs** | Encoder position save on first pass: "Saving the encoder position does not appear to be working. This needs debugging." |
| **support/tempTimeDisplay.mjs** | "TODO: properly format the time" — time formatting could be improved (e.g. leading zeros, locale). |
| **support/ribbon.mjs** | "TODO: Place holder for now" around bug/changeable graphics and positioning. |
| **support/efis-display.js** | "TODO: Delete this section" (second app); "TODO: Not sure if this can be deleted" re. `dataObject`. |
| **PiEFIS_Wayland_Setup.md** | "##TODO: ENABLE LOGGING ***" — logging setup not yet documented/done. |
| **CODE_REVIEW_RECOMMENDATIONS.md** | Item #19 (use `logging` module instead of print) still open. |

---

## 6. Quick Reference Summary

| Category | Items |
|----------|--------|
| **Features present but disabled** | Soft buttons |
| **Stub/broken code** | `VsiIndicator.createBackgroundGraphics()` |
| **Data sent but not displayed** | Temp/time, Speed (GS/TAS), Altitude (GPS/pressure/density), Magnetometer plot |
| **Cleanup** | Remove second canvas (`app2`), clarify `dataObject` usage |
| **Future** | Temperature graphs (EGT/CHT) — archived in `support/unused/temperatureGraph.mjs`; Magnetometer calibration — archived in `support/unused/magnetometerCalibrate.mjs`; Menu/Interactions — archived in `support/unused/interaction.mjs` |
| **Outstanding TODOs** | GPS digits, Vfe value, encoder position save, time formatting, ribbon bug placeholder, logging |
