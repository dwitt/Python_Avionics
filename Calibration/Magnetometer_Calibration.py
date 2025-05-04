import serial

port = "/dev/tty.usbmodem101"
baud_rate = 912600

ser = serial.Serial(port, baud_rate, timeout=1)

ser.write("a".encode('utf-8'))

while (True):
    data = ser.readline()
    print(data)
