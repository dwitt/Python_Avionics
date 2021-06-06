import asyncio
from aiohttp import web
import aiohttp
import json
import can
import RPi.GPIO as GPIO
import json
import struct

from pathlib import Path

global webServer, webSocket

# -----------------------------------------------------------------------------
# --- Asynchronous function to create the web and websocket servers         ---
# -----------------------------------------------------------------------------
# --- handler = the response handler to be used for the websocket serve     --- 
# -----------------------------------------------------------------------------
async def create_servers(handler):
    
    #Create the application and add routes
    #global webServer, webSocket

    # --- Create the web server                                             ---
    server = web.Application()

    server.add_routes([web.get('/', get_index),
                       web.static('/support/','./support/'),
                       web.get('/ws', handler)])
    
    #server.add_routes([web.static('/', 
    #        './')])

    # Create the application runner
    runner = web.AppRunner(server)

    # Start the application
    await runner.setup()

    # create the site
    site = web.TCPSite(runner, 'localhost', 8080)

    # Start the Site
    await site.start()

    print("Servers Started")

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
        self.altitude = 0

    @property
    def altitude(self):
        return self._altitude

    @altitude.setter
    def altitude(self, value):
        self._altitude = value




# -----------------------------------------------------------------------------
# --- Web Socket Response Handler class
# --- Created so that the web socket response object can be exposed for 
# --- later use sending data to the socket 
# -----------------------------------------------------------------------------

class WebSocketResponseHandler:
    def __init__(self):
        self.ws = None

    async def real_time_data(self, request):

        ws = web.WebSocketResponse()
        await ws.prepare(request)

        # save the request now that it is prepared
        self.ws = ws

        try:
            async for msg in ws:
                print("message recieved")
                if msg.type == aiohttp.WSMsgType.TEXT:
                    if msg.data == 'close':
                        await ws.close()
                    #else:
                    #    await ws.send_str(msg.data + '/answer')
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print('ws connection closed with exception %s' % ws.exception())
            
            print('websocket connection closed')
        finally:
            await ws.close()
        
        return ws

# -----------------------------------------------------------------------------

async def process_can_messages(reader, data):
    while True:
        msg = await reader.get_message()
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
            
            print(data.vsi)
            
        elif (msg.arbitration_id == 0x2E):
            (qnh_hpa, qnhx4, null3, null4, null5, null6) = (
                struct.unpack("<hhBBBB",msg.data))
            data.qnh = qnhx4 / 4.0
            print(data.qnh)


        await asyncio.sleep(0.02)

# -----------------------------------------------------------------------------
# --- Send regular updates to the client using json                         ---
# -----------------------------------------------------------------------------
async def send_json(handler, data):

    while True:
        if (handler.ws != None and not handler.ws.closed):
            await handler.ws.send_json(data.__dict__)
            
        await asyncio.sleep(0.02)


# -----------------------------------------------------------------------------
# --- Main Loop                                                             ---
# -----------------------------------------------------------------------------

async def main():

    # enc = Encoder.Encoder(4, 17)
    # GPIO.setup(4, GPIO.IN,  pull_up_down=GPIO.PUD_UP)
    # GPIO.setup(17, GPIO.IN, pull_up_down = GPIO.PUD_UP)

    # last_pos = 0
    # while True:
    #     pos = enc.read()
    #     if (last_pos != pos):
    #         print(pos)
    #         last_pos = pos

    avionics_data = AvionicsData()

    # --- Create an instance of the web socket response handler
    web_socket_handler = WebSocketResponseHandler()

    # --- Create the html and web socket servers and provide the web_socket
    # --- handler
    await create_servers(web_socket_handler.real_time_data)
    
    # create can bus interface
    bus = can.Bus(bustype='socketcan', channel='can0', bitrate=250000)
    # create a buffered reader
    reader = can.AsyncBufferedReader()
    # create a listener on the can bus
    listeners = [reader]
    # get the event loop
    loop = asyncio.get_event_loop()
    # create a notifier to let us know when messages arrive
    notifier = can.Notifier(bus=bus, listeners=listeners, timeout=0.01,
        loop=loop)

    # We should now be able to use the reader to get messages

    await asyncio.gather(process_can_messages(reader,avionics_data), send_json(web_socket_handler, avionics_data))
    while True:
        await asyncio.sleep(3600)     #sleep for an hour

# -----------------------------------------------------------------------------

if __name__ == "__main__":

    asyncio.run(main())

