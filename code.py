import time
import struct

import board
import busio
import canio
import digitalio
#import rotaryio
#import adafruit_character_lcd.character_lcd_i2c as character_lcd

import displayio
import terminalio
from digitalio import DigitalInOut, Direction, Pull

import adafruit_ssd1327 
import adafruit_displayio_sh1107
from adafruit_display_text import label

# Comment out libraries not used

#from adafruit_imageload import load
#from adafruit_bitmap_font import bitmap_font


from HoneywellHSC import HoneywellHSC
from kalman_filter import KalmanFilter

# Constants
OUTPUT_MIN = 1638
OUTPUT_MAX = 14745
PRESSURE_MIN = 0
PRESSURE_MAX = 103421

QNH = 2992
previous_QNH = QNH

# ----------------------------------------------------------------------
# --- CAN Message Numbers                                            ---
# ----------------------------------------------------------------------

AAV_id = 0x028
STATICP_id = 0x02B
QNH_id = 0x02E





cols = 20
rows = 4

print("Starting")

# --------------------------------------------------------------------
# --- Setup communication buses for various peripherals            ---
# --------------------------------------------------------------------

# i2c - Honeywell Static Pressure Transducer

i2c = board.I2C()
#i2c = busio.I2C(board.SCL, board.SDA)

# ----------------------------------------------------------------------
if hasattr(board, 'CAN_STANDBY'):
    standby = digitalio.DigitalInOut(board.CAN_STANDBY)
    standby.switch_to_output(False)
    
if hasattr(board, 'BOOST_ENABLE'):
    boost_enable = digitalio.DigitalInOut(board.BOOST_ENABLE)
    boost_enable.switch_to_output(True)
    
can = canio.CAN(rx=board.CAN_RX, tx=board.CAN_TX,
                baudrate=250_000, auto_restart=True)

# ----------------------------------------------------------------------
  
pressure_filter = KalmanFilter(q = 1, r = 1000, x = 101325)

my_hsc = HoneywellHSC(i2c, 0x28)


# i2c - SH1107 display
displayio.release_displays()
display_bus = displayio.I2CDisplay(i2c, device_address=0x3C)

WIDTH = 128
HEIGHT = 64
BORDER = 2

display = adafruit_displayio_sh1107.SH1107(display_bus,
    width = WIDTH, height = HEIGHT)


# --------------------------------------------------------------------
# --- Create an altitude display object                            ---
#---------------------------------------------------------------------

group = displayio.Group(max_size=5)
display.show(group)
print("Group Created")
text = " "*20

font = terminalio.FONT 
#font = bitmap_font.load_font("Tahoma-20.bdf")
color = 0xFFFFFF
ALT_text_area = label.Label(font = font, text = text, scale = 2, color = color)
ALT_text_area.anchor_point = (1.0,1.0)
ALT_text_area.anchored_position = (127,63)
ALT_text_area.text = "working"

ALT_LABEL_text_area = label.Label(font = font, text = text, scale = 2, color = color)
ALT_LABEL_text_area.anchor_point = (0.0, 1.0)
ALT_LABEL_text_area.anchored_position = (0, 63)
ALT_LABEL_text_area.text = "ALT"

PRES_LABEL_text_area = label.Label(font = font, text = text, scale = 2, color = color)
PRES_LABEL_text_area.anchor_point = (0.0, 1.0)
PRES_LABEL_text_area.anchored_position = (0, 42)
PRES_LABEL_text_area.text = "P"

PRES_text_area = label.Label(font = font, text = text, scale = 2, color = color)
PRES_text_area.anchor_point = (1.0, 1.0)
PRES_text_area.anchored_position = (127, 42)
PRES_text_area.text = str(101325)

QNH_text_area = label.Label(font = font, text = text, color = color)
QNH_text_area.anchor_point = (1.0, 0)
QNH_text_area.anchored_position = (128,0)
QNH_text_area.text = str(QNH / 100)

group.append(ALT_text_area)
group.append(ALT_LABEL_text_area)
group.append(PRES_LABEL_text_area)
group.append(PRES_text_area)
group.append(QNH_text_area)




# Initialize rotary encoder

last_Position = None


last_Time_Millis = int(time.monotonic_ns() / 1000000)

#while True:
#     time.sleep(1.0)
#     text_area.text ="help3"
#    pass

# ----------------------------------------------------------------------
# --- Create a CAN bus message mask for the QNH message              ---
# ----------------------------------------------------------------------

qnh_match = canio.Match(id=QNH_id)
qnh_listener = can.listen(matches=[qnh_match], timeout=0.1)



# ------------------------------------------------------------------------------
# Wait here until we can lock the i2C to allow us to scan it
# ------------------------------------------------------------------------------

# This can probably be deleted

#ALT_text_area.text = "help3"

while not i2c.try_lock():
    pass

try:

    print("I2C address found:", [hex(device_address) for device_address
                                 in i2c.scan()])

    i2c.unlock()
# ------------------------------------------------------------------------------
#try:

    # Get the pressure
    my_hsc.read_transducer()
    
    static_pressure = my_hsc.pressure
    static_pressure = pressure_filter.filter(static_pressure)

    previous_static_pressure = 0
    previous_altitude = 0

# ----------------------------------------------------------------------
# --- Main Loop                                                      ---
# ----------------------------------------------------------------------
# --- Tasks                                                          ---
# --- 1. Read the pressure periodically                              ---
# --- 2. Check if QNH has been transmitted                           ---
# --- 3. Update QNH and the QNH display if received                  ---
# --- 4. Update the altitude if either the pressure or QNH have change -
# --- 5. Update the local display only when the values change and    ---
# ---    only if a resonable interval has elapsed. (conserve cycles) ---
# --- 6. Transmit CAN data for AAV, STATICP and QNH periodically     ---
# ----------------------------------------------------------------------
# --- Units
# --- Static Pressure = kPa
# --- QNH = inHg
# --- Altitude = ft
 
    while True:

        current_Time_Millis = int(time.monotonic_ns() / 1000000)

#       --- Read the pressure transducer after every 50 ms           ---

        if current_Time_Millis - last_Time_Millis > 50:
            
            last_Time_Millis = current_Time_Millis
            
            my_hsc.read_transducer()
            
            previous_static_pressure = static_pressure
            static_pressure = my_hsc.pressure
            static_pressure = pressure_filter.filter(static_pressure)


            PRES_text_area.text = str(int(static_pressure))

        # --- Check for a QNH message on the CAN bus                 ---
        
        if (qnh_listener.in_waiting):
            message = qnh_listener.receive
            
            if (isinstance(message, canio.RemoteTransmissionRequest)):
                pass
            if (isinstance(message, canio.Message)):
                data = message.data
                if len(data) != 8:
                    print(f'Unusual message length {len(data)}')
                    continue # THIS JUMPS OUT OF THE WHILE LOOP???
                # unpack the message data
                # QNH contains a two byte short integer
                qnh_hpa = data.unpack("<h")
                # convert hPa to inHg * 100
                previous_QNH = QNH
                QNH = int(qnh_hpa * 0.0295299875 * 100)
        
        # --- QNH updated if recieved                                ---

        # --- update the display only if the value changed    

        if (previous_QNH != QNH):
            QNH_text_area.text = str(QNH / 100)

        # --- Calculate the altitued only if the pressure or QNH     ---
        # --- changed                                                ---

        if (previous_static_pressure != static_pressure or 
            previous_QNH != QNH):

            altitude = int(145442.0 * (
                pow(float(QNH / 2992), 0.1902632)
                - pow(float(static_pressure / 101325), 0.1902632)
            ))

        my_hsc.read_transducer()
        temperature = my_hsc.temperature

        if (altitude != previous_altitude):
            ALT_text_area.text = str(altitude)
            previous_altitude = altitude

        # --- Send CAN data
        # --- Initially just send this periodically                  ---

        AAV_data = struct.pack("<hBBBhB",
                               0,
                               altitude & 0x0ff,
                               (altitude >> 8) & 0xff,
                               (altitude >> 16) & 0xff,
                               0,
                               0)
        STATICP_data = struct.pack("<hbBBBBB",
                                   int(static_pressure / 10),
                                   int(temperature),
                                   0,0,0,0,0)

        print(STATICP_data)
finally:
    print("Unlocking")
    i2c.unlock()


