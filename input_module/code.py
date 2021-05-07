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
CAN_QNH_Period = 5000 # ms between messages
CAN_QNH_Timestamp = 0

# Set last postion of encoder

last_position = 0

# Setup SPI bus and CS for CAN

spi = busio.SPI(clock=board.GP6, MOSI=board.GP7, MISO=board.GP4)
cs = digitalio.DigitalInOut(board.GP5)
cs.direction = digitalio.Direction.OUTPUT

# Create CAN interface

can = CAN(spi, cs, baudrate=500000)

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
        
        last_position = position
        #sanitize qnh - Should have a range of 2200 3150
        qnh = 2992 + position / 4.0
        if (qnh > 3150):
            qnh = 3150
        elif (qnh < 2200):
            qnh = 2200

        print(qnh)
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
            print(message.id)
            # TODO handle an incoming qnh value
        
