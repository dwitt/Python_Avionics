# Project Rename Plan

## Current Structure
```
Aviation/
├── Python_Avionics/           ← git repo (remote: dwitt/Python_Avionics)
│   └── EFIS/                  ← all the actual code lives here
│       ├── aio_server.py
│       ├── support/
│       ├── copytopiefis.sh
│       └── ...
├── Arduino_Avionics/          ← no git repo
│   ├── AIR_Module/
│   ├── IMU_AHRS/
│   ├── Calibration/
│   └── ...
├── Python_Avionics_Electronics/
├── 3D Printing Files/
├── CAN Reference/
├── Crowbar_OVP/
├── Legacy/
└── Reference/
```

## Proposed Structure
```
PiAvionics/
├── EFIS/                      ← repo root (flattened)
│   ├── aio_server.py
│   ├── support/
│   ├── copytopiefis.sh
│   └── ...
├── Sensors/                   ← was Arduino_Avionics
│   ├── AIR_Module/
│   ├── IMU_AHRS/
│   ├── Calibration/
│   └── ...
├── Electronics/               ← was Python_Avionics_Electronics
├── 3D Printing Files/
├── CAN Reference/
├── Crowbar_OVP/
├── Legacy/
└── Reference/
```

## Rename Summary

| Current                      | New              | Why                                              |
|------------------------------|------------------|--------------------------------------------------|
| `Aviation/`                  | `PiAvionics/`    | Reflects the Pi-based avionics project           |
| `Python_Avionics/`           | Flatten into EFIS | Only contains EFIS/ and a README — unnecessary nesting |
| `Arduino_Avionics/`          | `Sensors/`       | Technology-agnostic — survives future chip swaps  |
| `Python_Avionics_Electronics/` | `Electronics/` | Simpler, no longer Python-specific               |

## Git Impact

- **Only one git repo exists**: `Python_Avionics/` with remote `dwitt/Python_Avionics`
- **Renaming outer folders** (Aviation → PiAvionics, Arduino_Avionics → Sensors, etc.): **Zero git impact.** Git doesn't know or care what the parent folders are called.
- **Flattening EFIS/ into repo root**: Git will see file moves. Using `git mv` preserves history cleanly. One commit, no data loss.
- **GitHub repo name**: Can stay as `dwitt/Python_Avionics` for now. Rename later independently if desired — GitHub auto-redirects old URLs.

## Step-by-Step Instructions

### 1. Close Everything
- Close VS Code
- Close any terminal sessions in these directories

### 2. Rename Outer Folders (in Finder or Terminal)
```bash
cd /Users/david/Documents/Projects
mv Aviation PiAvionics
mv PiAvionics/Arduino_Avionics PiAvionics/Sensors
mv PiAvionics/Python_Avionics_Electronics PiAvionics/Electronics
```

### 3. Flatten EFIS into Repo Root
```bash
cd /Users/david/Documents/Projects/PiAvionics/Python_Avionics

# Move everything from EFIS/ up to repo root
git mv EFIS/* .
git mv EFIS/.* .  2>/dev/null   # hidden files if any

# Remove the now-empty EFIS directory
rmdir EFIS

# Commit
git commit -m "Flatten EFIS directory into repo root"
```

### 4. Optionally Rename the Repo Folder
```bash
cd /Users/david/Documents/Projects/PiAvionics
mv Python_Avionics EFIS
```
This makes the local folder match what it contains. The git remote URL still works — git doesn't care about the folder name.

### 5. Reopen VS Code
- Open VS Code pointing at `/Users/david/Documents/Projects/PiAvionics/EFIS/`
- Start a new Claude Code session

### 6. Post-Rename Cleanup (in new session)
- Update `copytopiefis.sh` if any paths changed
- Verify `git push` works
- Update any absolute paths in scripts or configs

## Things That Won't Change
- The Pi itself — no changes needed on the Raspberry Pi
- The GitHub remote URL (unless you choose to rename the GitHub repo later)
- Any file contents — only folder structure changes
- Deploy workflow — `copytopiefis.sh` copies files by name, not by absolute path
