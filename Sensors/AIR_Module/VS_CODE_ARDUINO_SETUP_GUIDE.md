# VS Code Arduino Setup Guide for RP2040

This guide documents the complete VS Code setup for Arduino development with RP2040 boards (like Adafruit Feather RP2040).

## ⚠️ Important: Use VS Code Tasks (Not Arduino Extension)

**For RP2040 development, always use VS Code Tasks instead of the Arduino extension.**

### Why Tasks Are Better:
- ✅ **Reliable compilation** - Direct arduino-cli calls
- ✅ **No IntelliSense conflicts** - Uses custom c_cpp_properties.json
- ✅ **Works consistently** - Bypasses extension limitations
- ✅ **Future-proof** - Won't break with SDK updates

### Why Arduino Extension Fails:
- ❌ **Complex build process** - RP2040 has complex compilation steps
- ❌ **IntelliSense generation** - Extension can't handle Pico SDK complexity
- ❌ **Output parsing** - Extension fails to parse arduino-cli output
- ❌ **Error: `{"code":null}`** - Extension gives up on complex builds

## Quick Start for New Projects

### 1. Copy Configuration Files
```bash
# Copy the .vscode folder to your new project
cp -r /path/to/this/project/.vscode ./new-project/
# Remove generated files (they'll be recreated)
rm new-project/.vscode/browse.vc.db*
```

### 2. Modify for Your Project
Edit `.vscode/arduino.json`:
```json
{
    "sketch": "YourSketch.ino",  // Change this
    "board": "rp2040:rp2040:adafruit_feather",  // Change if different board
    "port": "/dev/tty.usbmodemXXXXX"  // Change to your port
}
```

## Essential Configuration Files

### `.vscode/arduino.json`
**Purpose**: Arduino extension configuration (minimal, for compatibility)
**Copy**: Yes, modify for new projects
```json
{
    "sketch": "AIR_Module.ino",
    "configuration": "flash=8388608_0,freq=200,opt=Small,profile=Disabled,rtti=Disabled,stackprotect=Disabled,exceptions=Disabled,dbgport=Disabled,dbglvl=None,usbstack=picosdk,ipbtstack=ipv4only,uploadmethod=default",
    "board": "rp2040:rp2040:adafruit_feather",
    "port": "/dev/tty.usbmodem11101",
    "arduino.path": "/opt/homebrew/bin/arduino-cli",
    "arduino.useArduinoCli": true,
    "arduino.logLevel": "debug",
    "arduino.disableIntelliSenseAutoGen": true,
    "arduino.skipHeaderProvider": true,
    "arduino.enableUSBDetection": false
}
```

### `.vscode/tasks.json`
**Purpose**: Build tasks for compilation and upload (PRIMARY METHOD)
**Copy**: Yes, modify sketch name and board
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Arduino: Verify",
            "type": "shell",
            "command": "/opt/homebrew/bin/arduino-cli",
            "args": [
                "compile",
                "--fqbn",
                "rp2040:rp2040:adafruit_feather",
                "AIR_Module.ino"
            ],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}
```

### `.vscode/c_cpp_properties.json`
**Purpose**: IntelliSense configuration
**Copy**: Yes, modify for different libraries
```json
{
    "configurations": [
        {
            "name": "RP2040",
            "includePath": [
                "${workspaceFolder}/**",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/cores/rp2040",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/variants/adafruit_feather",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/libraries/**",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/libraries/*/src",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/cores/rp2040/api/deprecated",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/cores/rp2040/api/deprecated-avr-comp",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/pico-sdk/src/**",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/pico-sdk/lib/**",
                "${env:HOME}/Library/Arduino15/packages/rp2040/hardware/rp2040/4.6.0/include/**",
                "${env:HOME}/Library/Arduino15/packages/rp2040/tools/pqt-gcc/4.1.0-1aec55e/arm-none-eabi/include",
                "${env:HOME}/Documents/Arduino/libraries/**"
            ],
            "defines": [
                "ARDUINO=10819",
                "ARDUINO_ADAFRUIT_FEATHER_RP2040",
                "ARDUINO_ARCH_RP2040"
            ],
            "compilerPath": "${env:HOME}/Library/Arduino15/packages/rp2040/tools/pqt-gcc/4.1.0-1aec55e/bin/arm-none-eabi-gcc",
            "cStandard": "gnu11",
            "cppStandard": "gnu++17",
            "intelliSenseMode": "gcc-arm"
        }
    ],
    "version": 4
}
```

## How to Use

### 🎯 **Recommended: VS Code Tasks**
1. **Compile**: `Cmd+Shift+P` → "Tasks: Run Task" → "Arduino: Verify"
2. **Upload**: `Cmd+Shift+P` → "Tasks: Run Task" → "Arduino: Upload"
3. **Keyboard Shortcut**: `Cmd+Shift+B` (default build task)

### 🔧 **Alternative: Terminal Direct**
```bash
# Compile
arduino-cli compile --fqbn rp2040:rp2040:adafruit_feather YourSketch.ino

# Upload
arduino-cli upload --fqbn rp2040:rp2040:adafruit_feather --port /dev/tty.usbmodemXXXXX YourSketch.ino
```

### ❌ **Avoid: Arduino Extension**
- Don't use the Arduino toolbar buttons
- Don't use "Arduino: Verify" from command palette
- These will fail with `{"code":null}` error

## Adding Libraries

### 1. Install Library
```bash
arduino-cli lib install "Library Name"
```

### 2. Find Library Path
```bash
find ~/Library/Arduino15 -name "LibraryName" -type d
```

### 3. Add to c_cpp_properties.json
Add to `includePath` array:
```json
"${env:HOME}/Library/Arduino15/libraries/LibraryName/src"
```

## Different Boards

### Common Board FQBNs:
- **Adafruit Feather RP2040**: `rp2040:rp2040:adafruit_feather`
- **Arduino Uno**: `arduino:avr:uno`
- **ESP32**: `esp32:esp32:esp32`
- **Arduino Nano**: `arduino:avr:nano`

### Change Board:
1. Edit `.vscode/arduino.json` - change `"board"`
2. Edit `.vscode/tasks.json` - change FQBN in args
3. Update `.vscode/c_cpp_properties.json` - change include paths

## Troubleshooting

### Arduino Extension Fails with `{"code":null}`:
- **Problem**: Extension tries to generate IntelliSense and fails
- **Solution**: Use VS Code Tasks instead
- **Why**: RP2040 has complex build process that extension can't handle
- **Status**: This is a known limitation, not a bug

### IntelliSense Issues:
- **Problem**: Can't find libraries or functions
- **Solution**: Add library paths to `c_cpp_properties.json`
- **Check**: Use `arduino-cli lib list` to see installed libraries

### Port Issues:
- **Problem**: Wrong port in arduino.json
- **Solution**: Use `arduino-cli board list` to find correct port
- **Update**: Change `"port"` in arduino.json

## Useful Commands

```bash
# List installed boards
arduino-cli board listall | grep -i feather

# List connected boards
arduino-cli board list

# List installed libraries
arduino-cli lib list

# Install library
arduino-cli lib install "Library Name"

# Compile sketch
arduino-cli compile --fqbn rp2040:rp2040:adafruit_feather sketch.ino

# Upload sketch
arduino-cli upload --fqbn rp2040:rp2040:adafruit_feather --port /dev/tty.usbmodemXXXXX sketch.ino
```

## File Summary

| File | Purpose | Copy to New Project? | Modify For |
|------|---------|---------------------|------------|
| `arduino.json` | Arduino extension config | Yes | New project, different board |
| `tasks.json` | Build tasks (PRIMARY) | Yes | New project, different board |
| `c_cpp_properties.json` | IntelliSense config | Yes | Adding libraries |
| `browse.vc.db*` | Generated files | No | Never |

## Pro Tips

1. **Always use VS Code Tasks** for RP2040 projects
2. **Keep a template folder** with these .vscode files
3. **Use `arduino-cli` commands** for troubleshooting
4. **Check library paths** if IntelliSense fails
5. **Update port** when switching devices
6. **Ignore Arduino extension errors** - they're expected with RP2040

## Why This Setup Works

- **Bypasses Arduino extension issues** with RP2040
- **Provides proper IntelliSense** via custom c_cpp_properties.json
- **Uses reliable arduino-cli** for compilation
- **Works consistently** across different projects
- **Future-proof** - won't break with SDK updates 