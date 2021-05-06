import time
import struct
import board
import busio
import digitalio
import rotaryio
from adafruit_mcp2515 import canio
from adafruit_mcp2515 import MCP2515 as CAN

spi = busio.SPI(clock=board.GP6, MOSI=board.GP7, MISO=board.GP4)
cs = digitalio.DigitalInOut(board.GP5)
cs.direction = digitalio.Direction.OUTPUT


can = CAN(spi, cs, baudrate=500000)

listener = can.listen(timeout=0.1)
# encP1 = digitalio.DigitalInOut(board.GP14)
# encP2 = digitalio.DigitalInOut(board.GP15)
# encP1.pull = digitalio.Pull.UP
# encP2.pull = digitalio.Pull.UP

enc = rotaryio.IncrementalEncoder(board.GP2, board.GP3)

CAN_QNH_Msg_id = 0x02E
CAN_QNH_Period = 5000 # ms between messages
CAN_QNH_Timestamp = 0

last_position = 0

while True:
    
    current_time_millis = int(time.monotonic_ns() / 1000000)
    
    position = enc.position
    if (position != last_position or 
        current_time_millis > CAN_QNH_Timestamp + CAN_QNH_Period):
        last_position = position
        qnh = 2992 + position
        print(qnh)
        qnh_hpa = int(qnh / 2.95299875)
        QNH_data = struct.pack("<hhBBBB",
                                qnh_hpa,
                                qnh,
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
        
