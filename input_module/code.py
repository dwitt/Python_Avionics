import time
import struct
import board
import busio
import digitalio
import rotaryio
from adafruit_mcp2515 import canio
from adafruit_mcp2515 import MCP2515 as CAN

# Set constants for CAN bus use

CAN_QNH_Msg_id = 0x02E
CAN_QNH_Period = 1000 # ms between messages
CAN_QNH_Timestamp = 0

# Set last postion of encoder

last_position = 0
last_timestamp = int(time.monotonic_ns() / 1000000)
qnh = 2992

# Setup SPI bus and CS for CAN

spi = busio.SPI(clock=board.GP6, MOSI=board.GP7, MISO=board.GP4)
cs = digitalio.DigitalInOut(board.GP5)
cs.direction = digitalio.Direction.OUTPUT

# Create CAN interface
# The can board in use has an 8 Mhz xtal but the baudrate is based on a 16 MHz
# xtal. Therefore, the baudrate below is actually 250000.
can = CAN(spi, cs, baudrate=500000)    # Actual 250,000 see above

# create a listener for the CAN bus

listener = can.listen(timeout=0.1)

# Create a rotary encoder

enc = rotaryio.IncrementalEncoder(board.GP2, board.GP3)

# Loop here

while True:
    
    current_time_millis = int(time.monotonic_ns() / 1000000)
    
    position = enc.position
    if (position != last_position or 
        current_time_millis > CAN_QNH_Timestamp + CAN_QNH_Period):
        
        # Check encoder rate
        position_change = last_position - position
        if ((current_time_millis - last_timestamp ) != 0):
            rate = abs(position_change / (current_time_millis - last_timestamp))
        else:
            rate = .0001

        last_timestamp = current_time_millis
        last_position = position
        
        

        if (rate < .001):
            position_change = position_change / 4.0

        #sanitize qnh - Should have a range of 2200 3150
        qnh = qnh + position_change
        if (qnh > 3150):
            qnh = 3150
        elif (qnh < 2200):
            qnh = 2200

        #print(qnh)
        qnh_hpa = int(qnh / 2.95299875)
        QNH_data = struct.pack("<hhBBBB",
                                qnh_hpa,
                                int(qnh*4),
                                0,0,0,0)
        message = canio.Message(CAN_QNH_Msg_id, QNH_data)
        can.send(message)
        CAN_QNH_Timestamp = current_time_millis
        #print("Can QNH")
        
        
    if (listener.in_waiting()):
        message = listener.receive()
        
        if (isinstance(message, canio.RemoteTransmissionRequest)):
            pass
        if (isinstance(message, canio.Message)):
            data = message.data
            if len(data) !=8:
                print(f'Unusual message length {len(data)}')
                continue # THIS JUMPS OUT OF THE WHILE LOOP???
            #print(message.id)
            # TODO handle an incoming qnh value
        
