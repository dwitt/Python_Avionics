import time
import board
import busio
#import rotaryio
#import adafruit_character_lcd.character_lcd_i2c as character_lcd

import displayio
import terminalio

import adafruit_displayio_sh1107 
from adafruit_display_text import label

# Comment out libraries not used
#from adafruit_hx8357 import HX8357

#from adafruit_imageload import load
#from adafruit_bitmap_font import bitmap_font


#from HoneywellHSC import HoneywellHSC
#from kalman_filter import KalmanFilter

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

#pressure_filter = KalmanFilter(q = 1, r = 1000, x = 101325)

#myBuffer = bytearray(4)



#my_hsc = HoneywellHSC(i2c, 0x28)



# i2c - SH1107 Display
display_bus = displayio.I2CDisplay(i2c, device_address=0x3C)
WIDTH = 128
HEIGHT = 64
BORDER = 2

display = adafruit_displayio_sh1107.SH1107(display_bus, 
    width=WIDTH, height=HEIGHT)

# background = displayio.Bitmap(display.width,
#             display.height,
#             2)
# for i in range(480):
#     for j in range(int(160)):
#         background[i, j] = 1

# background_palette = displayio.Palette(2)
# background_palette[0] = 0xff3300
# background_palette[1] = 0x0000ff
# background_tilegrid = displayio.TileGrid(
#     background,
#     pixel_shader = background_palette)



# --------------------------------------------------------------------
# --- Create an altitude display object                            ---
#---------------------------------------------------------------------

group = displayio.Group(max_size=3)
display.show(group)
print("Group Created")

# altimeter = Altimeter(480, 272)

# group.append(background_tilegrid)
# group.append(altimeter.group)



# # Display the Altimeter Tape
# altimeter_tape = AltimeterTape()
# altimeter_tape.group.x = 460
# altimeter_tape.group.y = 160
# group.append(altimeter_tape.group)



# altimeter_display = AltimeterDisplay()
# altimeter_display.group.x = 460
# altimeter_display.group.y = 160
# group.append(altimeter_display.group)





text = "29.92"
#font = terminalio.FONT 
#font = bitmap_font.load_font("Tahoma-20.bdf")
color = 0xFFFFFF
text_area = label.Label(terminalio.FONT, text = text, color = color)
text_area.anchor_point = (1.0,0.0)
text_area.anchored_position = (128,0)


group.append(text_area)



color_bitmap = displayio.Bitmap(WIDTH, HEIGHT, 1)
color_palette = displayio.Palette(1)
color_palette[0] = 0xFFFFFF

bg_sprite = displayio.TileGrid(color_bitmap, pixel_shader=color_palette, x=0, y=0)
group.append(bg_sprite)


#for i in range (12001):
#    altimeter_display.value = i
    #time.sleep(.05)

# for i in range(20000):
#     altitude_display.altitude = i
#     #time.sleep(0.001)



# Initialize rotary encoder

last_Position = None
#position = encoder.position

#lcd = character_lcd.Character_LCD_I2C(i2c, cols, rows)

last_Time_Millis = int(time.monotonic_ns() / 1000000)

while True:
    pass


while not i2c.try_lock():
    pass

try:

    print("I2C address found:", [hex(device_address) for device_address
                                 in i2c.scan()])

    i2c.unlock()

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

        # encoder
        QNH = 2992 + encoder.position/2
        text_area.text = str(int(QNH)/100)


        altitude = int(145442.0 * (
            pow(float(QNH / 2992), 0.1902632)
            - pow(float(static_pressure / 101325), 0.1902632)
        ))

        my_hsc.read_transducer()
        temperature = my_hsc.temperature

        if (altitude != previous_altitude):
            altimeter.altitude = altitude
            previous_altitude = altitude

 

finally:
    print("Unlocking")
    i2c.unlock()


