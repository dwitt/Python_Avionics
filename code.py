import time
import board
import busio
#import rotaryio
#import adafruit_character_lcd.character_lcd_i2c as character_lcd

import displayio
import terminalio
from digitalio import DigitalInOut, Direction, Pull

import adafruit_ssd1327 
import adafruit_displayio_sh1107
from adafruit_display_text import label

# Comment out libraries not used
#from adafruit_hx8357 import HX8357

#from adafruit_imageload import load
#from adafruit_bitmap_font import bitmap_font


from HoneywellHSC import HoneywellHSC
from kalman_filter import KalmanFilter

# Comment out libraries not used
#from altitude_display import AltitudeDisplay
#from numeric_wheel import NumericWheel
#from altimeter_display import AltimeterDisplay
#from altimeter_tape import AltimeterTape
#from altimeter import Altimeter

# Constants
OUTPUT_MIN = 1638
OUTPUT_MAX = 14745
PRESSURE_MIN = 0
PRESSURE_MAX = 103421

QNH_Standard = 2992

cols = 20
rows = 4

reset = DigitalInOut(board.D12)
reset.direction = Direction.OUTPUT  
reset.value = False
#time.sleep(.5)
reset.value = True
#time.sleep(2)

print("Starting")

# --------------------------------------------------------------------
# --- Setup communication buses for various peripherals            ---
# --------------------------------------------------------------------

# i2c - Honeywell Static Pressure Transducer
displayio.release_displays()
i2c = board.I2C()
#i2c = busio.I2C(board.SCL, board.SDA)



# spi - video display

#spi = board.SPI()
#spi = busio.SPI(clock=board.SCK, MOSI=board.MOSI, MISO=board.MISO)
#tft_cs = board.D5
#tft_dc = board.D6


#encoder = rotaryio.IncrementalEncoder(board.D4, board.D9)
# --------------------------------------------------------------------

pressure_filter = KalmanFilter(q = 1, r = 1000, x = 101325)

#myBuffer = bytearray(4)



my_hsc = HoneywellHSC(i2c, 0x28)



# i2c - SH1107 Display
#display_bus = displayio.I2CDisplay(i2c, device_address=0x3D)

# i2c - SH1107 display
display_bus = displayio.I2CDisplay(i2c, device_address=0x3C)
#time.sleep(2)
WIDTH = 128
HEIGHT = 64
BORDER = 2

display = adafruit_displayio_sh1107.SH1107(display_bus,
    width = WIDTH, height = HEIGHT)

#display = adafruit_ssd1327.SSD1327(display_bus, 
#    width=WIDTH, height=HEIGHT)

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
QNH_text_area.text = str(29.92)

group.append(ALT_text_area)
group.append(ALT_LABEL_text_area)
group.append(PRES_LABEL_text_area)
group.append(PRES_text_area)
group.append(QNH_text_area)




# Initialize rotary encoder

last_Position = None
#position = encoder.position

#lcd = character_lcd.Character_LCD_I2C(i2c, cols, rows)

last_Time_Millis = int(time.monotonic_ns() / 1000000)

#while True:
#     time.sleep(1.0)
#     text_area.text ="help3"
#    pass

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

    previous_altitude = 0

    while True:

        current_Time_Millis = int(time.monotonic_ns() / 1000000)
        #print("Elapsed: ", (current_Time_Millis - last_Time_Millis))

        if current_Time_Millis - last_Time_Millis > 50:
            
            last_Time_Millis = current_Time_Millis
            
            my_hsc.read_transducer()
            
            static_pressure = my_hsc.pressure
            static_pressure = pressure_filter.filter(static_pressure)

            PRES_text_area.text = str(int(static_pressure))

        # encoder
        QNH = 2992 #+ encoder.position/2
        #text_area.text = str(int(QNH)/100)


        altitude = int(145442.0 * (
            pow(float(QNH / 2992), 0.1902632)
            - pow(float(static_pressure / 101325), 0.1902632)
        ))

        my_hsc.read_transducer()
        temperature = my_hsc.temperature

        if (altitude != previous_altitude):
            ALT_text_area.text = str(altitude)
            previous_altitude = altitude

finally:
    print("Unlocking")
    i2c.unlock()


