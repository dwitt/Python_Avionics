# Menu System & Touch Input Plan

## Goal

Build a modular, touchscreen-driven menu system that overlays on the app2 canvas area. Menus are defined in external JSON files for easy editing. The system supports navigating nested menus, editing numeric and text values, and persisting settings to disk via the existing WebSocket connection.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Menu JSON Files                       │
│  (Human-editable definitions: labels, types, ranges, keys)   │
│              Served from /support/menus/ or /data/            │
└──────────────────────┬───────────────────────────────────────┘
                       │ fetch() on demand
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     menuSystem.mjs                            │
│  Loads JSON, renders menu screens, handles navigation        │
│  Uses: menuOverlay, touchKeyboard, valueEditor               │
└────┬──────────┬──────────┬──────────┬────────────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
 menuOverlay  touchKeyboard  valueEditor  settingsStore
   .mjs          .mjs          .mjs          .mjs
  (overlay     (on-screen    (input field   (read/write
   container    keyboards)    + validation)   + persist)
   on app2)
                                              │
                                              ▼ WebSocket JSON
                                        ┌──────────┐
                                        │ Python    │
                                        │ server    │
                                        │ saves to  │
                                        │ disk      │
                                        └──────────┘
```

---

## Menu Definition Format — JSON

### Why JSON (not Markdown)

- Native to JavaScript — `JSON.parse()` with no third-party parser
- Structured and typed — supports nested menus, value constraints, defaults
- Easy to edit in any text editor or VS Code
- Can be loaded via `fetch('/support/menus/main.json')`
- Supports comments via a `_comment` field if needed

### Menu Definition Structure

```json
{
    "title": "Configuration",
    "items": [
        {
            "label": "Airspeed Limits",
            "type": "submenu",
            "file": "airspeed-limits.json"
        },
        {
            "label": "Display Settings",
            "type": "submenu",
            "items": [
                {
                    "label": "Brightness Default",
                    "type": "number",
                    "key": "display.brightnessDefault",
                    "min": 0,
                    "max": 100,
                    "step": 5,
                    "unit": "%",
                    "default": 80
                },
                {
                    "label": "Heading Bug Color",
                    "type": "choice",
                    "key": "display.headingBugColor",
                    "options": ["Cyan", "Magenta", "Yellow", "Green"],
                    "default": "Cyan"
                }
            ]
        },
        {
            "label": "Aircraft Profile",
            "type": "submenu",
            "items": [
                {
                    "label": "Vso (Stall Flaps)",
                    "type": "number",
                    "key": "aircraft.vso",
                    "min": 20,
                    "max": 100,
                    "step": 1,
                    "unit": "kts",
                    "default": 35
                },
                {
                    "label": "Vne (Never Exceed)",
                    "type": "number",
                    "key": "aircraft.vne",
                    "min": 80,
                    "max": 300,
                    "step": 1,
                    "unit": "kts",
                    "default": 171
                },
                {
                    "label": "Aircraft ID",
                    "type": "text",
                    "key": "aircraft.id",
                    "maxLength": 10,
                    "default": ""
                }
            ]
        },
        {
            "label": "Navigation",
            "type": "submenu",
            "file": "navigation.json",
            "_comment": "Future: waypoints, route entry, database lookup"
        }
    ]
}
```

### Supported Item Types

| Type       | Description                          | Editor               |
|------------|--------------------------------------|-----------------------|
| `submenu`  | Opens a child menu                   | Navigate into it      |
| `number`   | Numeric value with min/max/step      | Numeric keypad        |
| `text`     | Free text entry                      | Full alpha keyboard   |
| `choice`   | Pick from a list of options          | Scrollable list       |
| `toggle`   | On/Off boolean                       | Tap to toggle         |
| `action`   | Triggers a callback (e.g. "Calibrate") | Tap to execute     |
| `coord`    | GPS coordinate entry                 | Coordinate keypad     |
| `ident`    | Waypoint identifier with DB lookup   | Alpha keyboard + search |

The first implementation phase covers: `submenu`, `number`, `text`, `choice`, `toggle`.
Later phases add: `coord`, `ident`, `action`.

### Submenu Loading

Submenus can be defined inline (`items` array) or in a separate file (`file` field). Separate files keep large menu trees manageable and let you edit one section without touching the rest.

---

## Modules

### 1. `menuOverlay.mjs` — Overlay Container Manager

**Purpose:** Manages a semi-transparent overlay on app2 that sits on top of any existing content (future HSI, etc).

**Responsibilities:**
- Creates a full-canvas dark overlay container (e.g. black at 85% opacity)
- Provides `show()` and `hide()` methods
- Manages z-ordering — overlay is always the topmost child of app2.stage
- Provides a content area container where menu screens render
- Handles the "dismiss" gesture (tap outside content, or a close button)

**Key Properties:**
```
overlayContainer    — The full-screen semi-transparent background
contentContainer    — Where menu/editor content is placed
visible             — Current visibility state
```

**Key Methods:**
```
show()              — Fade in or display the overlay
hide()              — Fade out or hide the overlay
setContent(container) — Replace the content area with new content
```

### 2. `menuRenderer.mjs` — Menu Screen Renderer

**Purpose:** Takes a menu definition (JSON object) and renders it as a scrollable, touchable list of items.

**Responsibilities:**
- Renders menu title bar with back button (if not root level)
- Renders each menu item as a touch-friendly row:
  - Label on the left
  - Current value (if applicable) on the right
  - Chevron `>` for submenus
  - Toggle switch graphic for toggles
- Handles touch events on each row
- Manages navigation stack (push submenu, pop to go back)
- Supports scrolling if items exceed visible area (touch drag or scroll buttons)
- Loads external JSON files for `file`-referenced submenus via fetch()

**Layout:**
```
┌─────────────────────────────────┐
│  ◀ Back     Configuration       │  ← Title bar with back button
├─────────────────────────────────┤
│  Airspeed Limits            >   │  ← Submenu row
├─────────────────────────────────┤
│  Display Settings           >   │
├─────────────────────────────────┤
│  Aircraft Profile           >   │
├─────────────────────────────────┤
│  Navigation                 >   │
├─────────────────────────────────┤
│                                 │
│           [Close]               │  ← Close button at bottom
└─────────────────────────────────┘
```

**Row sizing:** Each row should be at least 50-60px tall for reliable touch targets on a small screen. Title bar ~50px. Close button ~50px.

### 3. `touchKeyboard.mjs` — On-Screen Keyboards

**Purpose:** Provides configurable on-screen keyboards for different input types.

**Keyboard Layouts:**

#### Numeric Keypad
```
┌─────┬─────┬─────┬─────┐
│  7  │  8  │  9  │ ⌫   │
├─────┼─────┼─────┼─────┤
│  4  │  5  │  6  │  .  │
├─────┼─────┼─────┼─────┤
│  1  │  2  │  3  │ +/- │
├─────┼─────┼─────┼─────┤
│  0  │ CLR │ ENT │ ESC │
└─────┴─────┴─────┴─────┘
```

#### Alpha Keyboard
```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ Q │ W │ E │ R │ T │ Y │ U │ I │ O │ P │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ A │ S │ D │ F │ G │ H │ J │ K │ L │ ⌫ │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ Z │ X │ C │ V │ B │ N │ M │SPC│ENT│ESC│
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

#### Coordinate Keypad (Phase 2)
```
┌─────┬─────┬─────┬─────┐
│  7  │  8  │  9  │  N  │
├─────┼─────┼─────┼─────┤
│  4  │  5  │  6  │  S  │
├─────┼─────┼─────┼─────┤
│  1  │  2  │  3  │  E  │
├─────┼─────┼─────┼─────┤
│  0  │  .  │  W  │ ENT │
├─────┼─────┼─────┼─────┤
│  ⌫  │ CLR │     │ ESC │
└─────┴─────┴─────┴─────┘
```

**Responsibilities:**
- Creates a PixiJS Container with button grid
- Each key is a touch target (Container with Graphics background + Text)
- Fires a callback on key press: `onKey(key)` where key is the character or action
- Supports different layouts selected by mode: `'numeric'`, `'alpha'`, `'coord'`
- Highlights keys briefly on press for visual feedback
- Keys sized for touch: minimum 40×40px, ideally 50×50px

### 4. `valueEditor.mjs` — Input Field & Value Editing Screen

**Purpose:** Combines a display field with a keyboard to let the user edit a value.

**Layout:**
```
┌─────────────────────────────────┐
│  Edit: Vso (Stall Flaps)       │  ← Item label
├─────────────────────────────────┤
│                                 │
│         [ 35 ] kts              │  ← Current value in large text
│         Range: 20 - 100         │  ← Constraints shown below
│                                 │
├─────────────────────────────────┤
│  ┌─────┬─────┬─────┬─────┐     │
│  │  7  │  8  │  9  │ ⌫   │     │  ← Keyboard
│  ├─────┼─────┼─────┼─────┤     │
│  │  4  │  5  │  6  │  .  │     │
│  ├─────┼─────┼─────┼─────┤     │
│  │  1  │  2  │  3  │ +/- │     │
│  ├─────┼─────┼─────┼─────┤     │
│  │  0  │ CLR │ ENT │ ESC │     │
│  └─────┴─────┴─────┴─────┘     │
└─────────────────────────────────┘
```

**Responsibilities:**
- Displays the item label, current value, unit, and constraints
- Routes keyboard events to update the displayed value
- On ENT: validates the value (range check, format), saves via settingsStore, returns to menu
- On ESC: discards changes, returns to menu
- CLR: clears the input field
- For text entry: switches keyboard to alpha layout
- For choice type: shows a list of options instead of a keyboard

### 5. `settingsStore.mjs` — Settings Storage & Persistence

**Purpose:** Central store for all user-configurable values. Handles persistence via WebSocket to the Python server.

**Responsibilities:**
- In-memory key-value store (`Map` or plain object)
- `get(key)` — returns current value or default from menu definition
- `set(key, value)` — updates value in memory and triggers save
- `load()` — requests saved settings from server on startup
- `save()` — sends all settings to server via WebSocket for disk persistence
- Provides change notification so live displays can react to setting changes

**Persistence Flow:**
```
User edits value
    → settingsStore.set('aircraft.vso', 38)
    → sends WebSocket message: {"type": "settings", "key": "aircraft.vso", "value": 38}
    → Python server receives, updates in-memory dict, writes to settings.json

On page load:
    → settingsStore.load()
    → sends WebSocket message: {"type": "loadSettings"}
    → Python responds with full settings object
    → settingsStore populates from response
```

**Python-side changes (aio_server.py):**
- Add handler for `"settings"` message type — save key/value to a dict and write to `settings.json`
- Add handler for `"loadSettings"` — read `settings.json` and send back via WebSocket
- Settings file location: `./settings.json` (same directory as server)

### 6. `menuSystem.mjs` — Top-Level Controller

**Purpose:** Orchestrates everything. This is the single entry point that efis-display.js interacts with.

**Responsibilities:**
- Owns one instance each of: menuOverlay, menuRenderer, valueEditor, touchKeyboard, settingsStore
- Provides `open()` and `close()` methods
- Loads the root menu JSON on first open
- Coordinates transitions between menu screens and editor screens
- Passes the app2 reference so everything renders on the correct canvas

**Integration with efis-display.js:**
```javascript
import { MenuSystem } from './menuSystem.mjs';

// In setup():
menuSystem = new MenuSystem(app2, webSocket);

// Wire the config button to open the menu:
const menuCallback = {
    addContainer() {
        menuSystem.toggle();
    }
};
softButtons = new SoftButtons(app, menuCallback);
```

---

## File Structure

```
support/
├── menuSystem.mjs          — Top-level controller
├── menuOverlay.mjs         — Overlay container on app2
├── menuRenderer.mjs        — Renders menu lists from JSON
├── touchKeyboard.mjs       — On-screen keyboard layouts
├── valueEditor.mjs         — Value editing screen
├── settingsStore.mjs       — Settings read/write/persist
└── menus/
    ├── main.json           — Root menu definition
    ├── airspeed-limits.json — Airspeed V-speeds submenu
    ├── display-settings.json
    ├── aircraft-profile.json
    └── navigation.json     — Future: waypoint/route entry
```

---

## Implementation Phases

### Phase 1: Core Menu + Numeric Input
**Modules:** menuOverlay, menuRenderer, touchKeyboard (numeric only), valueEditor (number type), settingsStore (in-memory only)

**Delivers:**
- Config button opens overlay on app2
- Navigate a simple menu tree (submenus, back, close)
- Edit numeric values with keypad
- Values stored in memory (lost on refresh)
- Menu defined in a single JSON file

**Test with:** A few aircraft V-speed settings and a display brightness default.

### Phase 2: Persistence + Text Input
**Adds:** Alpha keyboard, text type support, WebSocket persistence, Python save/load

**Delivers:**
- Settings survive page refresh and server restart
- Text entry for things like aircraft ID, pilot name
- Choice type for selecting from options
- Toggle type for on/off settings
- Settings load automatically on startup

### Phase 3: Navigation Input (Future)
**Adds:** Coordinate keypad, ident type with database lookup

**Delivers:**
- Enter GPS coordinates (lat/lon) for waypoints
- Enter waypoint identifiers (e.g. "KJFK", "KOSH")
- Look up identifiers against a local database of airports/navaids
- Build and store a route as an ordered list of waypoints
- Route data available to HSI for course/bearing calculations

### Phase 4: Live Integration (Future)
- Settings changes update live displays immediately (e.g. changing Vso recolors the airspeed tape)
- Route data feeds the HSI course pointer and CDI
- Waypoint distance/bearing calculated from current GPS position

---

## Visual Design Notes

- **Background:** Dark semi-transparent overlay (black, 85% opacity) so the underlying display is dimly visible
- **Menu rows:** Dark grey background (0x333333), lighter on touch (0x555555), white text
- **Selected/active items:** Cyan highlight or border
- **Values:** Displayed in cyan on the right side of each row
- **Keyboard keys:** Dark grey (0x444444) with white text, lighter on press (0x666666)
- **Input field:** Black background with cyan text and a blinking cursor
- **Title bar:** Slightly lighter than menu rows, with a left-arrow back button
- **Touch feedback:** Brief colour flash on any touch target

---

## Open Questions

1. **Menu trigger:** Should the Config button on the main EFIS open the menu on app2? Or should there be a dedicated button on app2 itself?
2. **Multiple pages on app2:** When the menu is closed, should app2 show the HSI? Or should it be blank until we build the HSI?
3. **Settings scope:** Should settings be per-aircraft-profile, or a single global set?
4. **Waypoint database format:** For Phase 3, what database format for airport/navaid lookup? (CSV from FAA data, custom JSON, or SQlite via Python?)
5. **Font sizing:** The Pi display resolution will determine minimum comfortable text size for menu items and keyboard keys. What is the actual display resolution?
