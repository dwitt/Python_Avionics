import asyncio
from aiohttp import web
import aiohttp
import json
import can
# import RPi.GPIO as GPIO
import json
import struct

import time

from pathlib import Path

import board
#import busio
#import digitalio

from adafruit_seesaw import seesaw, rotaryio, digitalio

global webServer, webSocket

DEBUG = True

# Set constants for CAN bus use

CAN_QNH_MSG_ID = 0x02E
CAN_QNH_PERIOD = 1000 # ms between messages

# 

can_qnh_timestamp = 0

# -----------------------------------------------------------------------------
# --- Asynchronous function to create the web and websocket servers         ---
# -----------------------------------------------------------------------------
# --- handler = the response handler to be used for the websocket serve     --- 
# -----------------------------------------------------------------------------
async def create_servers(websocket_handler):
    
    #Create the application and add routes
    #global webServer, webSocket

    # -------------------------------------------------------------------------
    # --- Create the web server                                             ---
    # -------------------------------------------------------------------------
    
    # Notes: using web as that is how aiohttp was imported
    server = web.Application()

    # --- Add the routes used to respond to various requests
    # --- For the index file at '/' use the get index function
    # --- For /support/ just return the files from the directory
    # --- For /ws which is the web socket us the handler
    server.add_routes([web.get('/', get_index),
                       web.static('/support/','./support/'),
                       web.get('/ws', websocket_handler)])
    
    #server.add_routes([web.static('/', 
    #        './')]

    # Create the application runner
    runner = web.AppRunner(server)

    # Start the application
    await runner.setup()

    # create the site
    site = web.TCPSite(runner)  # Try this so we listen on all addresses
    #site = web.TCPSite(runner, 'localhost', 8080)

    # Start the Site
    await site.start()

    print("Server Started")

# -----------------------------------------------------------------------------
# --- handler for get_index                                                ---
# -----------------------------------------------------------------------------

async def get_index(request):
    if request.path == '/':
 
        indexFile = open(Path.cwd() / 'index.html')
        indexContent = indexFile.read()

    return web.Response(text=indexContent, content_type="text/html")

# -----------------------------------------------------------------------------
# --- Class for Avionics Data                                               ---
# -----------------------------------------------------------------------------
# TODO - Not sure if this is needed

class AvionicsData:
    def __init__(self):
        pass
        #self.altitude = 0





# -----------------------------------------------------------------------------
# --- Web Socket Response Handler class
# --- Created so that the web socket response object can be exposed for 
# --- later use sending data to the socket javascript create object with initializer and functions
# -----------------------------------------------------------------------------

class WebSocketResponse:
    def __init__(self):
        self._ws = None
        self.can_bus = None
        self.last_qnh = None
        self.can_qnh_timestamp = int(time.monotonic_ns() / 1000000)
        
    @property
    def ws(self):
        return (self._ws)

    # Function that is called when a request to create a websocket is received
    async def handler(self, request):
        """
        """

        # Create a websocket response object and prepare it for use
        ws = web.WebSocketResponse()
        await ws.prepare(request)

        # save the request now that it is prepared
        # this allows us to use the object elsewhere
        self._ws = ws

        try:
            async for msg in ws:
                #print("message recieved")
                if msg.type == aiohttp.WSMsgType.TEXT:
                    if msg.data == 'close':
                        await ws.close()
                    if msg.data == 'ready':
                        # do nothing really other than recognize that ready
                        # was sent
                        # print("Got Ready message")
                        pass
                    # check if message contains json data
                    
                    #TODO: Handle no data
                    
                    if msg.data[0:4] == 'json':
                        # decode the json
                        try:
                            dict_object = json.loads(msg.data[4:4])
                            try: 
                                # print(dict_object['qnh'])
                                print(dict_object['position'])
                                qnh = dict_object['qnh']
                                self.process_qnh(qnh)
                            except:
                                #data not recieved so ignore it
                                pass
                        except:
                            # if we didn't get any data then just ignore it
                            pass
                
                    #else:
                    #    await ws.send_str(msg.data + '/answer')
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print('ws connection closed with exception %s' % ws.exception())

            print('websocket connection closed')
        finally:
            await ws.close()

        return ws

    def process_qnh(self, qnh):
        """ Determine if qnh needs to be sent on the can bus."""
        current_time_millis = int(time.monotonic_ns() / 1000000)
        if (qnh != self.last_qnh or
            current_time_millis > self.can_qnh_timestamp + CAN_QNH_PERIOD):
            message = self.pack_can_qnh_msg(qnh)
            self.can_qnh_timestamp = current_time_millis
            self.last_qnh = qnh
            #print(f"QNH: {qnh}, Last QNH:{self.last_qnh}")
            #print(f"Sending can message {message}")
            self.can_bus.send(message)

    def pack_can_qnh_msg(self, qnh):
        """ Pack the qnh value ito a message for sending on the CAN bus """
        qnh_hpa = int(qnh / 2.95299875)
        qnh_message = struct.pack("<hhBBBB",
                                    qnh_hpa,
                                    int(qnh*4),
                                    0,0,0,0)
        message = can.Message(arbitration_id = CAN_QNH_MSG_ID,
                              data = qnh_message)
        return message

# -----------------------------------------------------------------------------
# --- Asyncronous process to get a message from the CAN bus buffer and      ---
# --- process it.                                                           ---
# -----------------------------------------------------------------------------

async def process_can_messages(reader, data):
    while True:
        if DEBUG:
            print("Looking for CAN msg")
        msg = await reader.get_message()
        if DEBUG:
            print("got msg")
        # kluge to get the altitued
        if (msg.arbitration_id == 0x28):
            data.altitude = msg.data[2] | (msg.data[3]<<8) | (msg.data[4]<<16)

            # Check for obvious signs of negative data
            # Check if high bit is a 1
            if ((msg.data[4] & 1<<7) == 1<<7):
                #XOR to peform 1s compliment (high byte was not sent by CAN)
                data.altitude = -1 * (data.altitude ^ 0xffffff)
            (data.airspeed, null2, null3, null4, data.vsi, null7) = (
                struct.unpack("<hBBBhB", msg.data))
            
            if DEBUG:
                print(data.vsi, data.airspeed)
            
        elif (msg.arbitration_id == 0x2E):
            (qnh_hpa, qnhx4, null3, null4, null5, null6) = (
                struct.unpack("<hhBBBB",msg.data))
            data.qnh = qnhx4 / 4.0
            if DEBUG:
                print(data.qnh)
            
        # process heading message    
        elif (msg.arbitration_id == 0x48):
            (data.yaw, data.pitch, data.roll, data.turn_rate) = (
                struct.unpack("<hhhh", msg.data)
            )
            
        # process accelerometer message
        elif (msg.arbitration_id == 0x49):
            (data.accx, data.accy, data.accz, data.calib) = (
                struct.unpack("<hhhh", msg.data)
            )

        await asyncio.sleep(0.02)

# -----------------------------------------------------------------------------
# --- Send regular updates to the client using json                         ---
# -----------------------------------------------------------------------------
async def send_json(web_socket_response, data):
    """
    Coroutine to send the data object as json to the web socket handler
    """

    while True:
        if DEBUG:
            print("Json Loop")
            print (f"Web Socket response :{web_socket_response.ws}")
            if (web_socket_response.ws is not None):
                print (f"Web Socekt Closed :{web_socket_response.ws.closed}")
        # --- Need to send message only when       
        if (web_socket_response.ws is not None and
            not web_socket_response.ws.closed):
            print("Send Json")
            await web_socket_response.ws.send_json(data.__dict__)

        await asyncio.sleep(0.02)


async def read_input(encoder, button, data):
    """
    Read the rotary encoder position and button status and store them in the
    data object.

    Keyword arguments:
    encoder -- an adafruit rotaryio object
    button -- an adafruit digitalio object
    data -- an object in which the data can be stored
    """
    while True:
        data.position = -encoder.position
        data.pressed = button.value
        #TODO: adjust the sleep time as large as possible to be repsonsive but
        #       let the can updates take presidence as these functions are time
        #       consuming
        await asyncio.sleep(0.2)

def connect_to_rotary_encoder(addr=0x36):
    """
    Use Seesaw to connect do an adafruit rotary encoder and return the encoder
    and the button.
    """
    # create seesaw connection to I2C
    my_seesaw = seesaw.Seesaw(board.I2C(), addr)

    seesaw_product = (my_seesaw.get_version() >> 16) & 0xFFFF
    print("Found product {}".format(seesaw_product))
    if seesaw_product != 4991:
        print("Wrong firmware loaded?  Expected 4991")

    my_seesaw.pin_mode(24, my_seesaw.INPUT_PULLUP)
    button = digitalio.DigitalIO(my_seesaw, 24)
    encoder = rotaryio.IncrementalEncoder(my_seesaw)

    return(encoder, button)

# -----------------------------------------------------------------------------
# --- Main Loop                                                             ---
# -----------------------------------------------------------------------------

async def main():
    """
    The main function for the program declared as a coroutine so that it can
    be run asynchronously.
    """

    (encoder, button) = connect_to_rotary_encoder()

    avionics_data = AvionicsData()

    # --- Create an instance of the web socket response handler
    # --- This allows us to access the websocket once it is instantiated using
    # --- the ws object of the handler in the send_json coroutine
    web_socket_response = WebSocketResponse()

    # --- Create the html and web socket servers and provide the web_socket
    # --- handler
    await create_servers(web_socket_response.handler)

    # -------------------------------------------------------------------------
    # --- create can bus interface
    # -------------------------------------------------------------------------

    bus = can.Bus(bustype='socketcan', channel='can0', bitrate=250000)
    # create a buffered reader
    reader = can.AsyncBufferedReader()
    # create a listener on the can bus
    listeners = [reader]
    # get the event loop
    loop = asyncio.get_event_loop()
    # create a notifier to let us know when messages arrive
    #notifier =
    can.Notifier(bus=bus, listeners=listeners, timeout=0.01,
        loop=loop)

    web_socket_response.can_bus = bus

    # -------------------------------------------------------------------------

    # We should now be able to use the reader to get messages

    await asyncio.gather(process_can_messages(reader,avionics_data),
                         send_json(web_socket_response, avionics_data),
                         read_input(encoder, button, avionics_data))
    while True:
        await asyncio.sleep(3600)     #sleep for an hour

# -----------------------------------------------------------------------------

if __name__ == "__main__":

    asyncio.run(main())
