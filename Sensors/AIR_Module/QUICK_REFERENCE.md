# Quick Reference - VS Code Arduino RP2040

## ⚠️ IMPORTANT: Use VS Code Tasks (Not Arduino Extension)

**Always use Tasks for RP2040 development - the Arduino extension will fail with `{"code":null}` error.**

## New Project Setup
```bash
# 1. Copy template
cp -r ~/Documents/Arduino/VS_Code_Template/.vscode ./

# 2. Edit arduino.json
"sketch": "YourSketch.ino"
"board": "rp2040:rp2040:adafruit_feather"
"port": "/dev/tty.usbmodemXXXXX"

# 3. Edit tasks.json
"args": ["compile", "--fqbn", "rp2040:rp2040:adafruit_feather", "YourSketch.ino"]
```

## Compile (Use These Methods)
- **🎯 VS Code Tasks** (Recommended): `Cmd+Shift+P` → "Tasks: Run Task" → "Arduino: Verify"
- **🔧 Terminal Direct**: `arduino-cli compile --fqbn rp2040:rp2040:adafruit_feather sketch.ino`
- **❌ Avoid Arduino Extension**: Will fail with `{"code":null}` error

## Upload (Use These Methods)
- **🎯 VS Code Tasks** (Recommended): `Cmd+Shift+P` → "Tasks: Run Task" → "Arduino: Upload"
- **🔧 Terminal Direct**: `arduino-cli upload --fqbn rp2040:rp2040:adafruit_feather --port /dev/tty.usbmodemXXXXX sketch.ino`

## Add Library
1. `arduino-cli lib install "LibraryName"`
2. Add to `c_cpp_properties.json` includePath:
   `"${env:HOME}/Library/Arduino15/libraries/LibraryName/src"`

## Common Commands
```bash
arduino-cli board list          # Connected boards
arduino-cli lib list           # Installed libraries
arduino-cli core list          # Installed cores
```

## Files to Copy
- ✅ `arduino.json` (modify sketch/board/port)
- ✅ `tasks.json` (modify sketch/board) - **PRIMARY METHOD**
- ✅ `c_cpp_properties.json` (modify for libraries)
- ❌ `browse.vc.db*` (don't copy)

## Why Tasks Work Better
- ✅ Direct arduino-cli calls (no extension processing)
- ✅ No IntelliSense conflicts
- ✅ Reliable compilation
- ✅ Future-proof 