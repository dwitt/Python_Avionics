import asyncio
from aiohttp import web
import aiohttp
import json
import can
import Encoder
import RPi.GPIO as GPIO

global webServer, webSocket

# -----------------------------------------------------------------------------
# --- Asynchronous function to create the web and websocket servers         ---
# -----------------------------------------------------------------------------
# --- handler = the response handler to be used for the websocket serve     ---
# -----------------------------------------------------------------------------
async def create_servers(handler):
    
    #Create the application and add routes
    #global webServer, runner, site

    # --- Create the web server                                             ---
    server = web.Application()
    # TODO - Change the static route to a handler that serves the index page
    # TODO - This implementation appears to block using the server for
    # TODO - websockets causing me to create a new server on a different port
    server.add_routes([web.static('/', 
            '/home/pi/Documents/Projects/PythonAvionics')])

    # Create the application runner
    runner = web.AppRunner(server)

    # Start the application
    await runner.setup()

    # create the site
    site = web.TCPSite(runner, 'localhost', 8080)

    # Start the Site
    await site.start()

    # -------------------------------------------------------------------------
    # --- Create the web socket server                                      ---
    webSocket = web.Application()
    webSocket.add_routes([web.get('/ws', handler)])

    socketRunner = web.AppRunner(webSocket)
    await socketRunner.setup()

    socketSite = web.TCPSite(socketRunner, 'localhost', 8081)

    await socketSite.start()

    print("Servers Started")

# 
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
        
        return ws

async def process_can_messages(reader, data):
    while True:
        msg = await reader.get_message()
        # kluge to get the altitued
        if (msg.arbitration_id == 0x28):
            # print(msg)
            # print(msg.data[2])
            # print(msg.data[3])
            # print(msg.data[4])
            data.altitude = msg.data[2] + (msg.data[3]<<8) + (msg.data[4]<<16)
            #print(data.altitude)
        if (msg.arbitration_id == 0x2E):
            print(msg)
        #print(msg)
        await asyncio.sleep(.01)

async def send_json(handler, data):
    i = 0
    while True:
        if (handler.ws != None):
            await handler.ws.send_json(data.altitude)
            i = i + 1
            
        await asyncio.sleep(0.1)

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
    # --- Create the html and web socket servers and provide the web socket
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

