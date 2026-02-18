# Code Review Recommendations for aio_server.py

## High Priority Changes

- [x] ### 1. Add null check for `reader` before calling `process_can_messages`
**Location:** Line 934  
**Issue:** `process_can_messages(reader, ...)` is called, but `reader` could be `None` if CAN is disabled  
**Recommendation:** Add check: `if reader is not None:` before appending to tasks  
**Status:** ✅ COMPLETED

- [x] ### 2. Add error handling for `reader.get_message()`
**Location:** Line 438  
**Issue:** If `reader.get_message()` raises an exception, the loop will crash  
**Recommendation:** Wrap in try/except to handle connection errors gracefully  
**Status:** ✅ COMPLETED

- [x] ### 3. Add file existence check for `index.html`
**Location:** Line 402  
**Issue:** Check if `index.html` exists before trying to open it  
**Recommendation:** Return 404 if file doesn't exist, or provide a default response  
**Status:** ✅ COMPLETED

## Medium Priority Changes

- [x] ### 4. Move `QNH_TO_HPA_CONVERSION` to module level
**Location:** Line 301  
**Issue:** `QNH_TO_HPA_CONVERSION` is defined inside function  
**Recommendation:** Move to module-level constants (around line 62) - makes it reusable and easier to maintain  
**Status:** ✅ COMPLETED

- [x] ### 5. Add QNH range validation
**Location:** Line 237  
**Issue:** QNH should be in a reasonable range (e.g., 28.0-31.0 inHg)  
**Recommendation:** Add validation: `qnh = max(28.0, min(31.0, float(qnh)))`  
**Status:** ✅ COMPLETED - Added constants `QNH_MIN_INHG_X_100 = 2800` and `QNH_MAX_INHG_X_100 = 3100`, and validation in `process_json_data` to clamp QNH values to the valid range (28.00-31.00 inHg). Note: QNH values are in inHg × 100 format, so range is 2800-3100.

- [x] ### 6. Add rate limiting to `send_json`
**Location:** Line 763  
**Issue:** No delay between sends - could flood the websocket  
**Recommendation:** Consider adding: `await asyncio.sleep(0.05)` for ~20Hz update rate  
**Status:** ✅ COMPLETED - Added `JSON_UPDATE_RATE = 0.05` constant and implemented rate limiting

- [x] ### 7. Extract magic numbers to named constants
**Locations:** Multiple  
**Issues:**
- Line 553: `360-data.yaw/10` - scaling factor `10` should be a constant
- Line 554: `-data.pitch / 10` - same
- Line 555: `data.roll / 10` - same
- Line 514: `qnhx4 / 4.0` - qnhx4 is inHg × 400, dividing by 4.0 converts to inHg
- Line 338: `int(qnh*4)` - qnh is inHg × 100, multiplying by 4 creates inHg × 400 for accuracy preservation
- Line 232: `2992` - default QNH value (29.92 inHg × 100) should be a constant
- Line 811: `abs(...) < 100` - encoder threshold should be a constant
- Line 845: `4991` - expected seesaw product ID should be a constant
- Line 848: `pin_mode(24, ...)` - pin number should be a constant

**Recommendation:** Create constants like:
```python
AHRS_SCALING_FACTOR = 10  # AHRS values are sent as 10x actual value
QNH_INHG_TO_HPA_SCALE = 100  # QNH values are stored/transmitted as inHg × 100 (e.g., 2992 = 29.92 inHg)
QNH_ACCURACY_MULTIPLIER = 4  # QNH is multiplied by 4 to create inHg × 400 for accuracy preservation in short int
QNH_DEFAULT_INHG_X_100 = 2992  # Default QNH: 29.92 inHg × 100
ENCODER_THRESHOLD = 100
SEESAW_EXPECTED_PRODUCT_ID = 4991
ENCODER_BUTTON_PIN = 24
```

**Note:** QNH format clarification:
- QNH values are received/sent in inHg × 100 format (e.g., 2992 = 29.92 inHg)
- When packing for CAN: `qnh*4` creates inHg × 400 to preserve accuracy in short int
- When unpacking from CAN: `qnhx4 / 4.0` converts inHg × 400 back to inHg

**Status:** ✅ COMPLETED - Added all constants and replaced magic numbers:
- `AHRS_SCALING_FACTOR = 10` - used in yaw, pitch, roll calculations
- `QNH_ACCURACY_MULTIPLIER = 4` - used when packing/unpacking QNH for CAN
- `QNH_DEFAULT_INHG_X_100 = 2992` - default QNH value
- `ENCODER_THRESHOLD = 100` - minimum encoder position change
- `SEESAW_EXPECTED_PRODUCT_ID = 4991` - expected seesaw product ID
- `ENCODER_BUTTON_PIN = 24` - GPIO pin for encoder button

- [x] ### 8. Fix typo "Asyncronous"
**Location:** Line 419  
**Issue:** "Asyncronous" should be "Asynchronous"  
**Recommendation:** Fix the typo  
**Status:** ✅ COMPLETED - Fixed typo "Asyncronous" to "Asynchronous" in comment

- [x] ### 9. Add check for websocket closing state
**Location:** Line 185  
**Issue:** Before closing existing websocket, check if it's already closing  
**Recommendation:** Add: `if self._ws is not None and not self._ws.closing:`  
**Status:** ✅ COMPLETED - Added check for `closed` state and `closing` state (if available) before attempting to close websocket

## Low Priority Changes

- [x] ### 10. Add cleanup handlers for CAN bus resources
**Location:** Lines 894-906  
**Issue:** `bus` and `notifier` are created but never cleaned up on shutdown  
**Recommendation:** Add cleanup handlers or use context managers for graceful shutdown  
**Status:** ✅ COMPLETED - Added cleanup handlers:
- Signal handlers for SIGTERM and SIGINT to handle systemd service stops and Ctrl+C
- `cleanup_can_resources()` function that stops the notifier and closes the bus
- try/finally block in `main()` to ensure cleanup happens even if tasks are cancelled
- Global variables to store bus and notifier references for cleanup access

- [x] ### 11. Update incorrect comment about `avionics_data`
**Location:** Line 926  
**Issue:** Comment said "Right now I don't think this is used" but `avionics_data` IS used  
**Recommendation:** Remove or update the comment  
**Status:** ✅ COMPLETED - Updated comment to accurately describe how `avionics_data` is used: passed to process_can_messages(), monitor_timeout(), send_json(), read_input(), and assigned to web_socket_response.data

- [x] ### 12. Document or remove unclear comments
**Location:** Line 235  
**Issue:** "not sure why we return web_socket" - either document why or remove if unnecessary  
**Recommendation:** Either document the reason or remove the return statement if not needed  
**Status:** ✅ COMPLETED - Updated comment to explain that returning the websocket response is required by aiohttp's API. The framework uses the return value to manage the websocket connection lifecycle. The websocket is also stored in self._ws for access via the web_socket property.

- [x] ### 13. Unused variable `notifier`
**Location:** Line 950  
**Issue:** `notifier` was created but never used after initialization  
**Recommendation:** Either use it for cleanup or document why it's stored  
**Status:** ✅ COMPLETED - The notifier is now used for cleanup (stored in `_can_notifier` and stopped in `cleanup_can_resources()`). Removed the intermediate local variable and directly assign to `_can_notifier` to eliminate the unused variable.

- [x] ### 14. Missing docstring parameters
**Locations:** Multiple functions  
**Issues:**
- `process_qnh`: Missing parameter type and description
- `send_json`: Missing information about send rate/frequency  
**Recommendation:** Add complete docstrings with parameter descriptions  
**Status:** ✅ COMPLETED - Updated both docstrings:
- `process_qnh`: Added parameter type (int) and Note section explaining when QNH is sent
- `send_json`: Added complete parameter descriptions with types, and Note section explaining send rate (JSON_UPDATE_RATE = 0.05s = 20Hz) and behavior

- [x] ### 15. Hardcoded values that could be configurable
**Locations:** Multiple  
**Issues:**
- Line 152: `/sys/class/backlight` - could be a constant
- Line 862: `I2C(1)` - bus number could be configurable
- Line 847: `0x36` - encoder address could be a constant  
**Recommendation:** Move to configuration constants section  
**Status:** ✅ COMPLETED - Added constants for all hardcoded values:
- `BACKLIGHT_DIR = "/sys/class/backlight"` - base directory for backlight devices
- `ENCODER_I2C_BUS = 1` - I2C bus number for rotary encoder
- `ENCODER_I2C_ADDRESS = 0x36` - default I2C address for rotary encoder
All hardcoded values have been replaced with these constants.

## Code Organization Suggestions

- [x] ### 16. Refactor long `process_can_messages` function
**Location:** Line 461  
**Issue:** Function was 300+ lines long  
**Recommendation:** Split into smaller functions per message type  
**Status:** ✅ COMPLETED - Refactored into:
- Helper function `validate_message_length()` for common validation
- Individual handler functions for each message type (altitude, static pressure, QNH, AHRS orient, AHRS accel, GPS1, GPS2, MAGX, MAGY, MAGZ, time sync)
- Dispatch dictionary `CAN_MESSAGE_HANDLERS` mapping message IDs to handlers
- Simplified main `process_can_messages()` function (~50 lines) that uses dispatch pattern
This makes the code more maintainable, testable, and easier to extend with new message types.

- [x] ### 17. Group related constants together
**Location:** Lines 23-91  
**Issue:** Constants were somewhat scattered  
**Recommendation:** Group by category:
- Debug constants
- CAN bus constants
- Hardware constants (encoder, backlight)
- Timeout constants
- Conversion factors  
**Status:** ✅ COMPLETED - Reorganized all constants into clear sections with headers:
- Debugging constants
- CAN bus configuration (including CAN_MSG_ID enum)
- Hardware configuration (backlight and encoder grouped together)
- Timeout and rate configuration
- Data conversion and scaling factors (QNH and AHRS grouped together)
All related constants are now grouped logically with clear section headers.

## Security Considerations

- [x] ### 18. File path validation
**Location:** Line 417  
**Issue:** `Path.cwd() / 'index.html'` - validate path exists and is within expected directory  
**Recommendation:** Consider using `Path(__file__).parent` instead of `cwd()` for more predictable paths  
**Status:** ✅ COMPLETED - Updated to use `Path(__file__).parent` instead of `Path.cwd()` for more predictable paths. Added security validation to ensure the resolved path stays within the script directory (prevents directory traversal attacks). Added error handling for path resolution failures.

## Performance Considerations

- [ ] ### 19. Consider using logging module instead of print statements
**Location:** Throughout  
**Issue:** Many print statements for debugging  
**Recommendation:** Use Python's `logging` module for better control and filtering

- [x] ### 20. Consider adding rate limiting to websocket sends
**Location:** Line 839  
**Issue:** `send_json` sends data as fast as possible  
**Recommendation:** Add rate limiting to prevent flooding the client  
**Status:** ✅ COMPLETED - This was completed as part of recommendation #6. Rate limiting is implemented using `JSON_UPDATE_RATE = 0.05` seconds (20Hz) with `await asyncio.sleep(JSON_UPDATE_RATE)` in the `send_json` function.

## Notes

- All high priority items should be addressed for production use
- Medium priority items improve code quality and maintainability
- Low priority items are nice-to-haves but not critical
- Some changes may require testing to ensure they don't break existing functionality
