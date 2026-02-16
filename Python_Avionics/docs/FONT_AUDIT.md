# EFIS Font Size & Style Reference

All font sizes currently used across the EFIS codebase. All fonts are Tahoma (TTF).

## Font Size Summary

| Size | Weight | Color | Files | Purpose |
|------|--------|-------|-------|---------|
| 12 | normal | `0x00ffff` cyan | displayRectangle.mjs | Unit text (°C, kts), legend text |
| 16 | normal | `0xffffff` white | vsi-indicator.mjs | VSI minor tick labels (.5 values) |
| 20 | normal | `0xffffff` white | attitude-indicator.mjs, airSpeedWheel.mjs, altitudeWheel.mjs, userInput.mjs | Pitch labels, unit labels (kts, ft), debug text |
| 20 | normal | `0xbbbbbb` grey | hsi.mjs, softButtons.mjs, menuOverlay.mjs | HSI compass numbers, ground speed, buttons, toggle labels |
| 20 | normal | `0x00ffff` cyan | displayRectangle.mjs, ribbon.mjs, hsi.mjs, headingIndicator.mjs, menuOverlay.mjs | Data values, bug readouts, toggle states |
| 22 | normal | `0xffffff` white | vsi-indicator.mjs | VSI major tick labels (1, 2) |
| 22 | normal | `0xbbbbbb` grey | headingIndicator.mjs, ribbon.mjs | Heading ribbon labels, altitude/speed ribbon labels |
| 22 | bold | `0xffffff` white | hsi.mjs, menuOverlay.mjs | HSI cardinal letters (N/S/E/W), menu title |
| 28 | bold | `0xffffff` white | headingIndicator.mjs, hsi.mjs | Heading magnifier, HSI heading readout |
| 28 | bold | `0xffffff` white | altitudeWheel.mjs | Altitude rolling digits (tens, hundreds) |
| 37 | bold | `0xffffff` white | airSpeedWheel.mjs, altitudeWheel.mjs | Rolling digits (airspeed all, altitude thousands/ten-thousands) |

## Detailed File Reference

| File | Line | Size | Weight | Color | Purpose |
|------|------|------|--------|-------|---------|
| attitude-indicator.mjs | 281 | 20 | normal | `0xffffff` | Pitch degree labels |
| airSpeedWheel.mjs | 32 | 20 | normal | `0xffffff` | Airspeed units (kts) |
| airSpeedWheel.mjs | 16-22 | 37 | bold | `0xffffff` | Rolling digits (hundreds, tens, ones) |
| altitudeWheel.mjs | 47 | 20 | normal | `0xffffff` | Altitude units (ft) |
| altitudeWheel.mjs | 26-29 | 28 | bold | `0xffffff` | Rolling digits (tens, hundreds) |
| altitudeWheel.mjs | 32-35 | 37 | bold | `0xffffff` | Rolling digits (thousands, ten-thousands) |
| displayRectangle.mjs | 78 | 20 | normal | `0x00ffff` | Semi-static data values |
| displayRectangle.mjs | 116 | 12 | normal | `0x00ffff` | Unit text (°C, etc) |
| displayRectangle.mjs | 158 | 12 | normal | `0x00ffff` | Legend text |
| headingIndicator.mjs | 198 | 22 | normal | `0xbbbbbb` | Heading ribbon labels |
| headingIndicator.mjs | 302 | 28 | bold | `0xffffff` | Magnifier heading value |
| headingIndicator.mjs | 504 | 20 | normal | `0x00ffff` | Heading bug readout |
| hsi.mjs | 71 | 20 | normal | `0xbbbbbb` | Compass numeric labels |
| hsi.mjs | 76 | 22 | bold | `0xffffff` | Cardinal labels (N/S/E/W) |
| hsi.mjs | 191 | 28 | bold | `0xffffff` | Heading readout box |
| hsi.mjs | 301 | 20 | normal | `0x00ffff` | Bug readout box |
| hsi.mjs | 319 | 20 | normal | `0xbbbbbb` | Ground speed readout |
| menuOverlay.mjs | 66 | 22 | bold | `0xffffff` | Menu title |
| menuOverlay.mjs | 111 | 20 | normal | `0xbbbbbb` | Toggle labels |
| menuOverlay.mjs | 125 | 20 | normal | `0x00ffff` / `0x666666` | Toggle ON/OFF state |
| menuOverlay.mjs | 160 | 20 | normal | `0xbbbbbb` | Close button |
| ribbon.mjs | 244 | 22 | normal | `0xbbbbbb` | Ribbon altitude/speed labels |
| ribbon.mjs | 479 | 20 | normal | `0x00ffff` | Ribbon bug value |
| softButtons.mjs | 60 | 20 | normal | `0xbbbbbb` | Button text |
| userInput.mjs | 69 | 20 | normal | `0xffffff` | Debug encoder text |
| vsi-indicator.mjs | 217 | 16 | normal | `0xffffff` | VSI minor tick labels (.5) |
| vsi-indicator.mjs | 253 | 22 | normal | `0xffffff` | VSI major tick labels (1, 2) |

## Standard Sizes

| Tier | Size | Role |
|------|------|------|
| XS | 12 | Units, legends, small annotations |
| S | 16 | Minor instrument labels |
| M | 20 | Standard labels, readouts, buttons, bug values |
| L | 22 | Scale labels, titles, cardinal letters |
| XL | 28 | Primary digital readouts (magnifiers) |
| XXL | 37 | Rolling digit displays |

## Standard Colors

| Name | Value | Use |
|------|-------|-----|
| White | `0xffffff` | Primary text, instrument markings |
| Grey | `0xbbbbbb` | Secondary labels, scale markings, button text |
| Cyan | `0x00ffff` | Interactive/user-adjustable values, bug readouts |
| Chartreuse | `chartreuse` | Speed/altitude display values (displayRectangle overrides) |
| Dark Grey | `0x666666` | Disabled/inactive states |
