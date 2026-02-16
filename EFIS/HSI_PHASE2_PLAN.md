# HSI Phase 2 — Course Pointer, CDI, TO/FROM & Flight Plan Navigation

## Context

Phase 1 (complete) built the compass rose, ground track diamond, heading bug with CRS readout, ground speed, and encoder control. Phase 2 adds GPS navigation using imported Garmin FPL flight plans. The server will parse flight plans, compute navigation data (bearing, cross-track error, distance, TO/FROM), and send it to the browser in the existing JSON stream. The HSI will display a course pointer needle, CDI deviation bar, and TO/FROM indicator.

**Key decisions:**
- Navigation computation runs server-side (Python) — consistent with existing data pipeline
- Flight plan auto-loads on startup (newest .fpl in ~/flightplans/), reloads when files change
- Auto-sequencing: waypoints advance automatically when aircraft passes abeam

## Architecture

```
~/flightplans/*.fpl  →  Python FPL parser  →  Navigation computer (runs at GPS rate)
                                                    ↓
GPS lat/lon (CAN) ──→ aio_server.py ──→ JSON stream ──→ browser ──→ HSI Phase 2
                                          (adds: dtk, xtrack, dist, to_from,
                                           wpt_id, route_name)
```

## Plan

### Step 1: Create `flightplan.py` — FPL parser + nav computer (~150 lines)

New Python module alongside aio_server.py.

**FlightPlan class:**
- `load(filepath)` — parse Garmin FPL XML using `xml.etree.ElementTree`
  - Handle both UTF-8 and UTF-16 encoding (ForeFlight sends both)
  - Extract waypoint table: list of `{id, type, lat, lon, alt}` dicts
  - Extract route: ordered list of waypoint identifiers
  - Build route as list of waypoints with lat/lon in decimal degrees
  - GPS lat/lon from CAN is integer (×10⁶) — divide when comparing
- `route_name` — from `<route-name>` element
- `waypoints` — ordered list of route waypoints with lat/lon
- `active_leg` — index of current leg (0 = first leg)
- `next_waypoint()` / `prev_waypoint()` — manual sequencing
- `active_waypoint_id` — identifier of current target waypoint

**NavComputer class (or functions):**
- `compute(lat, lon, flight_plan)` → dict with:
  - `dtk` — desired track (great-circle bearing from previous WPT to active WPT), degrees
  - `bearing` — bearing from current position to active waypoint, degrees
  - `xtrack` — cross-track distance in NM (positive = right of course, negative = left)
  - `dist` — distance to active waypoint in NM
  - `to_from` — "TO" if heading toward waypoint, "FROM" if past it
  - `wpt_id` — active waypoint identifier string
  - `route_name` — flight plan route name

**Navigation math (all great-circle on WGS84 sphere, R=3440.065 NM):**
- **Bearing:** `atan2(sin(Δlon)·cos(lat2), cos(lat1)·sin(lat2) - sin(lat1)·cos(lat2)·cos(Δlon))`
- **Distance:** haversine formula
- **Cross-track:** `asin(sin(d13/R)·sin(θ13-θ12)) · R` where d13=distance to WPT1, θ13=bearing to WPT1, θ12=DTK
- **TO/FROM:** if abs(bearing_to_wpt - dtk) < 90° → "TO", else "FROM"

**Auto-sequencing logic:**
- When `to_from` flips to "FROM" and `dist` < threshold (e.g., 2 NM), advance to next leg
- At last waypoint, stay on "FROM" (don't wrap)

**File watching:**
- `check_for_new_plans(directory)` — check ~/flightplans/ for newest .fpl file
- Called periodically (every 5 seconds) or on startup only

### Step 2: Modify `aio_server.py` — integrate nav computer

**2a. Add nav fields to AvionicsData class** (after line 135):
```python
self.dtk = None          # desired track (degrees)
self.bearing = None      # bearing to active waypoint (degrees)
self.xtrack = None       # cross-track error (NM, + = right)
self.nav_dist = None     # distance to waypoint (NM)
self.to_from = None      # "TO" or "FROM"
self.wpt_id = None       # active waypoint identifier
self.route_name = None   # flight plan name
```

These flow automatically to the browser via `data.__dict__` in send_json().

**2b. Add navigation coroutine** (~20 lines):
```python
async def update_navigation(data, flight_plan):
    """Compute nav data from GPS position and flight plan at 1Hz"""
    while True:
        if (data.latitude is not None and data.longitude is not None
                and flight_plan.waypoints):
            nav = compute_navigation(data.latitude, data.longitude, flight_plan)
            data.dtk = nav['dtk']
            data.bearing = nav['bearing']
            data.xtrack = nav['xtrack']
            data.nav_dist = nav['dist']
            data.to_from = nav['to_from']
            data.wpt_id = nav['wpt_id']
            data.route_name = nav['route_name']
        await asyncio.sleep(1.0)  # 1 Hz is plenty for nav
```

**2c. In main():** Load flight plan, add coroutine to task list:
```python
from flightplan import FlightPlan, compute_navigation
flight_plan = FlightPlan()
flight_plan.load_newest(Path.home() / 'flightplans')
coroutines.append(update_navigation(avionics_data, flight_plan))
```

### Step 3: Modify `support/hsi.mjs` — add Phase 2 visual elements

**3a. Course pointer needle** (rotates with CRS/heading bug value):
- Thin line through centre, from top to bottom of rose
- Arrow head at top, single bar at bottom
- Color: magenta (0xff00ff) — standard GPS nav color
- Rotates relative to heading: `rotation = (CRS - heading) * π/180`
- Already have `_bugValue` as the CRS — reuse this
- Create as a Container that rotates, added to fixedContainer

**3b. CDI bar** (lateral offset perpendicular to course pointer):
- Short thick bar across the centre, perpendicular to course line
- Offset from centre proportional to cross-track error
- Full-scale deflection: ±2 NM (configurable)
- 5 dots: centre + 2 each side (small circles as reference)
- Bar slides left/right across the dots
- Color: magenta
- Lives inside the course pointer container so it rotates with course

**3c. TO/FROM indicator:**
- Small triangle above centre (TO) or below centre (FROM)
- Filled magenta triangle
- Only one visible at a time
- Positioned along the course pointer line

**3d. New properties/setters:**
```javascript
set courseDeviation(nm)   // positions CDI bar (-2 to +2 NM)
set toFrom(value)         // "TO", "FROM", or null — shows/hides triangles
set desiredTrack(deg)     // rotates course pointer (could use existing bugValue)
set waypointId(id)        // update waypoint display (future)
set navDistance(nm)        // distance to waypoint (future display)
```

**3e. Course pointer vs heading bug:**
The existing heading bug (cyan V-notch) becomes the CRS selector on the rose edge. The new course pointer (magenta needle through centre) shows the same CRS value but as a full needle. Both rotate together based on `_bugValue`.

### Step 4: Modify `support/efis-display.js` — wire nav data

In DisplayUpdateLoop(), after existing HSI wiring (~line 456):
```javascript
if (dataObject.xtrack !== undefined && dataObject.xtrack !== null) {
    hsi.courseDeviation = dataObject.xtrack;
}
if (dataObject.to_from !== undefined && dataObject.to_from !== null) {
    hsi.toFrom = dataObject.to_from;
}
```

The course pointer rotation is already driven by the CRS/bug value (encoder-set), not by server data. The DTK from server could optionally override this in a "GPS steering" mode later.

## Files to Modify

| File | Action | Change |
|------|--------|--------|
| `flightplan.py` | CREATE | FPL parser + nav computation (~150 lines) |
| `aio_server.py` | MODIFY | Add nav fields to AvionicsData, add nav coroutine, load FPL in main() |
| `support/hsi.mjs` | MODIFY | Add course pointer, CDI bar, TO/FROM indicator, new setters |
| `support/efis-display.js` | MODIFY | Wire nav data fields to HSI |

## Visual Layout

```
        [000]           CRS 045°
    ┌─────────────────────────┐
    │         ▽ lubber        │
    │     ╱       ╲           │
    │   ╱   ▲TO     ╲        │  ▲ = TO indicator (magenta)
    │  │    │         │       │  │ = course pointer needle
    │  │  · · ┃ · ·   │      │  ┃ = CDI bar (slides L/R)
    │  │    ◇         │       │  · = CDI dots
    │   ╲   │       ╱         │
    │     ╲ │     ╱           │
    │       ╲   ╱             │
    │         ┼               │
    └─────────────────────────┘
         GS: 95 kts
```

## Implementation Order

1. **flightplan.py** — parser + nav math (can be tested standalone)
2. **aio_server.py** — integrate nav computer, add fields
3. **hsi.mjs** — course pointer needle + CDI dots + CDI bar + TO/FROM
4. **efis-display.js** — wire the new data fields

## Verification

1. Place a .fpl file in ~/flightplans/ on the Pi
2. Restart the server — check logs for "Loaded flight plan: CYFD TO CYFD"
3. Verify nav fields appear in browser console (`dataObject.dtk`, `dataObject.xtrack`, etc.)
4. HSI should show:
   - Magenta course pointer needle through centre, aligned with CRS value
   - CDI dots across centre perpendicular to needle
   - CDI bar deflected based on cross-track error from flight plan
   - TO/FROM triangle visible
5. Rotate CRS with encoder — needle and CDI rotate together
6. If GPS position updates, CDI deflection and TO/FROM should update
7. When passing abeam a waypoint, active waypoint should auto-advance
