import serial

port = "/dev/tty.usbmodem3101"
baud_rate = 912600

ser = serial.Serial(port, baud_rate, timeout=1)

