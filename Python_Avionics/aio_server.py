""" Asychronous I/O based webserver to handle page and websocket"""
# pyright: reportMissingImports=false

import asyncio
import json
import struct
import time
import datetime
from pathlib import Path
from aiohttp import web #pylint: disable=import-error
import aiohttp #pylint: disable=import-error
import can #pylint: disable=import-error

from enum import Enum

#import board #pylint: disable=import-error
from adafruit_extended_bus import ExtendedI2C as I2C
from adafruit_seesaw import seesaw, rotaryio, digitalio #pylint: disable=import-error

from rpi_backlight import Backlight

# Debugging constants
DEBUG = False
DEBUG_CAN = False
DEBUG_JSON = False
DEBUG_QNH = False
DEBUG_GPS_TIME = False
DEBUG_DISABLE_ENCODER = False
DEBUG_DISABLE_CAN = False
DEBUG_WEBSOCKET = False

# Set constants for CAN bus use

CAN_QNH_MSG_ID = 0x2
CAN_QNH_PERIOD = 1000 # ms between messages (1 second between transmitting qnh)

class CAN_MSG_ID(Enum):
    AHRS_ORIENT = 0x48
    AHRS_ACCEL = 0x49
    ENCODER = 0x38

CAN_AHRS_ORIENT_MSG_ID = 0x48
CAN_AHRS_ACCEL_MSG_ID = 0x49
CAN_GPS1_MSG_ID = 0x63
CAN_GPS2_MSG_ID = 0x64

CAN_MAGX_MSG_ID = 0x81
CAN_MAGY_MSG_ID = 0x82
CAN_MAGZ_MSG_ID = 0x83

CAN_STATICP_MSG_ID = 0x2B
CAN_TIME_SYNC_ID = 0x19

print(CAN_MSG_ID.AHRS_ORIENT)
# *****************************************************************************
# *** CLASS for Avionics Data                                               ***
# *****************************************************************************

class AvionicsData:
    """Class to store all the avionics data recieved over the CAN bus in."""
    # An instance of this class will be used to share the data between the
    # process_can_messages and send_json functions
    def __init__(self):
        # set any default value here
        # self.can_qnh = None
        pass    # do nothing

# *****************************************************************************

# *****************************************************************************
# *** CLASS Web Socket Response Handler
# *** Created so that the web socket response object can be exposed for
# *** later use sending data to the socket.
# *****************************************************************************

class MyWebSocketResponse:
    """Class to handle websocket responses"""
    def __init__(self):
        self._ws = None
        self.can_bus = None
        self.data = None
        self.last_qnh = None
        self.can_qnh_timestamp = int(time.monotonic_ns() / 1000000)
        self.backlight = Backlight()

    @property
    def web_socket(self):
        """Returns the web socket once it has been created"""
        return self._ws

    # Function that is called when a request to create a websocket is received
    async def handler(self, request):
        """Handler to process web socket requests"""
        if DEBUG_QNH:
            print("handler called")
        # close an existing web socket    
        if self._ws is not None:
            await self._ws.close()
        # Create a websocket response object and prepare it for use
        web_socket = web.WebSocketResponse()
        await web_socket.prepare(request)

        # save the request now that it is prepared
        # this allows us to use the object elsewhere
        self._ws = web_socket
        try:
            # Iterate over the messages (msg) return by the Web Socket (web_socket)
            # I expect we should sit in this loop until told to close the socket
            async for msg in web_socket:
                if DEBUG_WEBSOCKET:
                    print("websocket message recieved")
                if msg.type == aiohttp.WSMsgType.TEXT:
                    if msg.data[0:5] == 'close':
                        if DEBUG_WEBSOCKET:
                            print("websocket close message")
                        await web_socket.close()
                    if msg.data[0:5] == 'ready':
                        # do nothing really other than recognize that ready
                        # was sent
                        if DEBUG_WEBSOCKET:
                            print("websocket ready message")
                        pass
                    #TODO: Handle no data
                    # The efis-display.js will send json data prefixed with 'json'
                    if msg.data[0:4] == 'json':
                        if DEBUG_WEBSOCKET:
                            print("json message")
                        # process the json send from the efis-display.js
                        self.process_json_data(msg)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    if DEBUG_WEBSOCKET:
                        print('ws connection closed with exception %s' % web_socket.exception())
            if DEBUG_WEBSOCKET:
                print('websocket connection closed')
        finally:
            # Allways execute this code
            # Close the web socket
            if DEBUG_WEBSOCKET:
                print('websocket connection closed in finally')
            await web_socket.close()

        #not sure why we return web_socket
        return web_socket

    def process_json_data(self, web_socket_message):
        """Process any json that is contained in the web socket message"""

        if DEBUG_CAN:
            print("websocket message with json recieved")

        # decode the json
        try:
            dict_object = json.loads(web_socket_message.data[4:])
            try:
                if DEBUG_QNH:
                    print("QNH from json=", end = "")
                    print(dict_object['qnh'], end = "")
                # process a qnh object
                qnh = dict_object['qnh']
                brightness = dict_object['brightness']
                if DEBUG:
                    print(f'Brightness: {brightness}')
                self.process_qnh(qnh)
                # process a brightness object
                self.backlight.brightness = brightness

                # 

            except: # pylint: disable=bare-except
                #data not recieved so ignore it
                pass
        except: # pylint: disable=bare-except
            # if we didn't get any data then just ignore it
            pass

    def process_qnh(self, qnh):
        """ Determine if qnh needs to be sent on the can bus based on
            whether it has changed or if sufficient time has elapsed.
            If it needs to be sent out pack it into the message and send it."""
        current_time_millis = int(time.monotonic_ns() / 1000000)
        if (qnh != self.last_qnh or
            current_time_millis > self.can_qnh_timestamp + CAN_QNH_PERIOD):

            if DEBUG_CAN:
                print("prepare to send QNH on CAN")
                print(f"qnh = {qnh}")
            if DEBUG_QNH:
                print(", sending via CAN")

            message = self.pack_can_qnh_msg(qnh)
            self.can_qnh_timestamp = current_time_millis
            self.last_qnh = qnh
            #print(f"QNH: {qnh}, Last QNH:{self.last_qnh}")
            #print(f"Sending can message {message}")

            if DEBUG_CAN:
                print(self.can_bus)

            self.can_bus.send(message)

            if DEBUG_CAN:
                print(f"Message sent on {self.can_bus.channel_info}")

    def pack_can_qnh_msg(self, qnh):
        """ Pack the qnh value ito a message for sending on the CAN bus """
        qnh_hpa = int(qnh / 2.95299875)
        qnh_message = struct.pack("<hhBBBB",
                                    qnh_hpa,
                                    int(qnh*4),
                                    0,0,0,0)
        message = can.Message(arbitration_id = CAN_QNH_MSG_ID,
                              data = qnh_message,
                              is_extended_id = False)
        if DEBUG_CAN:
            print(message)
        return message
    
# *****************************************************************************

# -----------------------------------------------------------------------------
# --- Asynchronous function to create the web and websocket servers         ---
# -----------------------------------------------------------------------------
# --- handler = the response handler to be used for the websocket serve     ---
# -----------------------------------------------------------------------------
async def create_servers(websocket_handler):
    """Create web server to handle requests for both the web page and the
        websocket"""

    # -------------------------------------------------------------------------
    # --- Create the web server                                             ---
    # -------------------------------------------------------------------------

    # Notes: using web as that is how aiohttp was imported
    # Create an application instance
    server = web.Application()

    # --- Add the routes used to respond to various requests
    # --- For the index file at '/' use the get_index response function
    # --- For /support/ just return the files from the directory
    # --- For /ws which is the web socket use the MyWebSocketResponse handler
    server.add_routes([web.get('/', get_index),
                       web.static('/support/','./support/'),
                       web.get('/ws', websocket_handler)])

    # Create the application runner
    runner = web.AppRunner(server)

    # Start the application
    await runner.setup()

    # create the site
    site = web.TCPSite(runner)  # Try this so we listen on all addresses
    # The following should be used for the production version
    #site = web.TCPSite(runner, 'localhost', 8080)

    # Start the Site
    await site.start()

    print("aio-Server.py has started the web server.")

# -----------------------------------------------------------------------------
# --- handler for get_index                                                ---
# -----------------------------------------------------------------------------

async def get_index(request):
    """Return index.html file when the root directory is requested"""
    if request.path == '/':

        index_file = open(Path.cwd() / 'index.html')
        index_content = index_file.read()

    return web.Response(text=index_content, content_type="text/html")




# -----------------------------------------------------------------------------
# --- Asyncronous process to get a message from the CAN bus buffer and      ---
# --- process it.                                                           ---
# -----------------------------------------------------------------------------

async def process_can_messages(reader, data, last_received_times):
    """Process the can messages when the are recieved"""

    # Execution will remain in this function an occur asynchronously
    # Variables delcared will be accessible

    while True: #loop here forever - keep processing messages
        if DEBUG_CAN:
            print("Looking for CAN msg")
        msg = await reader.get_message()
        if DEBUG_CAN:
            print("got msg")
        # kluge to get the altitud
        if msg.arbitration_id == 0x28:
            data.altitude = msg.data[2] | (msg.data[3]<<8) | (msg.data[4]<<16)

            # Check for obvious signs of negative data
            # Check if high bit is a 1
            if (msg.data[4] & 1<<7) == 1<<7:
                #XOR to peform 1s compliment (high byte was not sent by CAN)
                data.altitude = -1 * (data.altitude ^ 0xffffff)
            (data.airspeed, dummy_2, dummy_3, dummy_4, data.vsi, dummy_7) = (
                struct.unpack("<hBBBhB", msg.data))

            if DEBUG:
                print(data.vsi, data.airspeed)

        # recieve static pressure and temperature
        elif msg.arbitration_id == CAN_STATICP_MSG_ID:
            (static_pressure, temperature, differential_pressure, _, _, _) = (
                struct.unpack("<hbhbbb", msg.data)
            )
            data.static_pressure = static_pressure
            data.temperature = temperature
            data.differential_pressure = differential_pressure

        elif msg.arbitration_id == 0x2E:
            (qnh_hpa, qnhx4, dummy_3, dummy_4, dummy_5, dummy_6) = (
                struct.unpack("<hhBBBB",msg.data))
            data.can_qnh = qnhx4 / 4.0 # send the can data marlked as such
            data.can_qnh_hpa = qnh_hpa

            if DEBUG_JSON:
                print(data.can_qnh)

        # process heading message
        elif msg.arbitration_id == CAN_MSG_ID.AHRS_ORIENT.value:
            if DEBUG_CAN:
                print("orient")

            (data.yaw, data.pitch, data.roll, data.turn_rate) = (
                struct.unpack("<hhhh", msg.data)
            )
            data.yaw = data.yaw / 10
            data.pitch = data.pitch / 10
            data.roll = data.roll / 10
            last_received_times[CAN_MSG_ID.AHRS_ORIENT.value] = time.time()


        # process accelerometer message
        elif msg.arbitration_id == CAN_MSG_ID.AHRS_ACCEL.value:
            if DEBUG_CAN:
                print("accel")
            (data.accx, data.accy, data.accz, data.calib) = (
                struct.unpack("<hhhh", msg.data)
            )
            last_received_times[CAN_MSG_ID.AHRS_ACCEL.value] = time.time()

        # process encoder message
        # elif msg.arbitration_id == CAN_MSG_ID.ENCODER.value:
        #     if DEBUG_CAN:
        #         print("encoder")
        #     (data.position, data.pressed) = (
        #         struct.unpack("<i?", msg.data)
        #     )

        # process GPS1 message
        elif msg.arbitration_id == CAN_GPS1_MSG_ID:
            (latitude, longitude) = (
                struct.unpack("<ll", msg.data)
            )
            #TODO: Check if we are carrying enough significant digits
            #       in the following calculations
            data.latitude = latitude #/ 10^6
            data.longitude = longitude #/ 10^6

        # process GPS2 message
        elif msg.arbitration_id == CAN_GPS2_MSG_ID:
            (data.gps_speed, data.gps_altitude, data.true_track, _) = (
                struct.unpack("<hhhh", msg.data)
            )

        # process MAG X message
        # keep only the first element of the tuple returned
        elif msg.arbitration_id == CAN_MAGX_MSG_ID:
            data.magx = struct.unpack("<f", msg.data)[0]


        # process MAG Y message
        # keep only the first element of the tuple returned
        elif msg.arbitration_id == CAN_MAGY_MSG_ID:
            data.magy = struct.unpack("<f", msg.data)[0]

        # process MAG Z message
        elif msg.arbitration_id == CAN_MAGZ_MSG_ID:
            # keep only the first element of the tuple returned
            data.magz = struct.unpack("<f", msg.data)[0]

        # process Time Sync message
        elif msg.arbitration_id == CAN_TIME_SYNC_ID:
            (data.tm_year, data.tm_mon, data.tm_mday,
             data.tm_hour, data.tm_min, data.tm_sec, _, _) = (
                struct.unpack("<bbbbbbbb", msg.data)
                )
            data.tm_year = 2000 + data.tm_year


            gps_datetime = datetime.datetime(
                data.tm_year,
                data.tm_mon,
                data.tm_mday,
                data.tm_hour,
                data.tm_min,
                data.tm_sec,
                tzinfo = None
            )
            if DEBUG_GPS_TIME:
                print(f"{gps_datetime}")

        await asyncio.sleep(0)  #let another process run
    
async def monitor_timeout(data, last_received_times):
    
    timeout = 0.2

    while True:

        current_time = time.time()
        for message_id in list(last_received_times.keys()):
            if current_time - last_received_times[message_id] > timeout:
                if message_id == CAN_MSG_ID.AHRS_ORIENT.value:
                    if DEBUG_CAN:
                        print(time.time)
                        print(current_time)
                        print(last_received_times[message_id])
                    data.yaw = None
                    data.pitch = None
                    data.roll = None
                if message_id == CAN_MSG_ID.AHRS_ACCEL.value:
                    data.accx = None
                    data.accy = None
                    data.accz = None
                
        await asyncio.sleep(0)  #let another process run

# -----------------------------------------------------------------------------
# --- Send regular updates to the client using json                         ---
# -----------------------------------------------------------------------------
async def send_json(web_socket_response, data):
    """
    Coroutine to send the data object as json to the web socket handler
    """

    while True: # Loop here forever
        if DEBUG:
            print("Json Loop")
            print (f"Web Socket response :{web_socket_response.web_socket}")
            if web_socket_response.web_socket is not None:
                print (f"Web Socekt Closed :{web_socket_response.web_socket.closed}")
        # Send json data only when a WebSocket exists and is not closed
        if (web_socket_response.web_socket is not None and
            not web_socket_response.web_socket.closed):
            if DEBUG_JSON:
                print("Send Json")
                print("Json Send qnh = ",data.can_qnh)
                #print("Json qnhx4 = ", data.qnhx4) 
                print("Json Alt = ", data.altitude)
            # use and exception handler as the socket could be closed inadvertently
            try:
                await web_socket_response.web_socket.send_json(data.__dict__)
            except:
                pass
        await asyncio.sleep(0)


async def read_input(encoder, button, data):
    """
    Read the rotary encoder position and button status and store them in the
    data object.

    Should be called by run or gather

    Keyword arguments:
    encoder -- an adafruit rotaryio object
    button -- an adafruit digitalio object
    data -- an object in which the data can be stored
    """
    last_encoder_position = -encoder.position
    while True:
        new_encoder_position = -encoder.position
        if abs(new_encoder_position - last_encoder_position) < 100:
            data.position = new_encoder_position
            last_encoder_position = new_encoder_position
        #data.position = -encoder.position
        data.pressed = not button.value
        #TODO: adjust the sleep time as large as possible to be repsonsive but
        #       let the can updates take presidence as these functions are time
        #       consuming
        await asyncio.sleep(0)

def connect_to_rotary_encoder(addr=0x36):
    """
    Use Seesaw to connect do an adafruit rotary encoder and return the encoder
    and the button.
    """
    # create seesaw connection to I2C
    #my_seesaw = seesaw.Seesaw(board.I2C(), addr)
    my_seesaw = seesaw.Seesaw(I2C(5), addr)

    seesaw_product = (my_seesaw.get_version() >> 16) & 0xFFFF
    if DEBUG:
        print("Found product {}".format(seesaw_product))
    if seesaw_product != 4991:
        print("Wrong firmware loaded?  Expected 4991")

    my_seesaw.pin_mode(24, my_seesaw.INPUT_PULLUP)
    button = digitalio.DigitalIO(my_seesaw, 24)
    encoder = rotaryio.IncrementalEncoder(my_seesaw)

    return(encoder, button)

# -----------------------------------------------------------------------------
# --- Main Loop - Called from the end of this file                          ---
# -----------------------------------------------------------------------------

async def main():
    """
    The main function for the program declared as a coroutine so that it can
    be run asynchronously.
    """
    # --- Create the instance of the encoder and button
    if not DEBUG_DISABLE_ENCODER:
        (encoder, button) = connect_to_rotary_encoder()

    # --- Create an instance of the AvionicsData class to store the data in
    ### Right now I don't think this is used
    avionics_data = AvionicsData()

    # --- Create an instance of the MyWebSocketResponse Class
    # --- This allows us to access the websocket once it is instantiated using
    # --- the ws object of the handler in the send_json coroutine
    web_socket_response = MyWebSocketResponse()

    # --- Create the html and web socket servers and provide the web_socket
    # --- handler. Once the servers are started they will call
    # --- the MyWebSocketResponse.handler when ever a request comes in
    await create_servers(web_socket_response.handler)

    # -------------------------------------------------------------------------
    # --- create can bus interface
    # -------------------------------------------------------------------------

    if not DEBUG_DISABLE_CAN:
        bus = can.Bus(interface='socketcan', channel='can0', bitrate=250000)
        # create a buffered reader
        reader = can.AsyncBufferedReader()
        # create a listener on the can bus
        listeners = [reader]
        # get the event loop
        loop = asyncio.get_event_loop()
        # create a notifier to let us know when messages arrive
        #notifier =
        can.Notifier(bus=bus, listeners=listeners, timeout=0.1,
            loop=loop)

        # --- update the web socket response handler so that it can communicate
        # --- with the CAN bus and see the avionics data

        web_socket_response.can_bus = bus
    
    web_socket_response.data = avionics_data

    # -------------------------------------------------------------------------
    # --- create a dictionary to keep track of when CAN messages are
    # --- received. 
    # -------------------------------------------------------------------------

    last_received_times = {}

    # -------------------------------------------------------------------------

    # We should now be able to use the reader to get messages

   
    await asyncio.gather(process_can_messages(reader,avionics_data, last_received_times),
                            monitor_timeout(avionics_data, last_received_times),
                            send_json(web_socket_response, avionics_data),
                            read_input(encoder, button, avionics_data))
    while True:
        await asyncio.sleep(3600)     #sleep for an hour

# -----------------------------------------------------------------------------
# --- This Python Script starts here.                                       ---
# --- main() is call using asyncio                                          ---
# -----------------------------------------------------------------------------

if __name__ == "__main__":

    asyncio.run(main())