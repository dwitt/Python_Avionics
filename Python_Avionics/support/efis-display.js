//global PIXI 
//import { Application, Graphics } from './pixi.min.js';
import { Application, Graphics, Container } from './pixi.min.mjs';

import { Ribbon } from './ribbon.mjs';
import { AirspeedRibbon } from './airspeedRibbon.mjs';
import { VsiIndicator } from './vsi-indicator.mjs';
import { AttitudeIndicator } from './attitude-indicator.mjs';
import { SlipBallIndicator } from './slipBall.mjs';
import { HeadingIndicator } from './headingIndicator.mjs';
import { Interactions } from './interaction.mjs';
import { QNHDisplay } from './qnhdisplay.mjs';
import { SpeedDisplay } from './speedDisplay.mjs';
import { AltitudeDisplay } from './altitudeDisplay.mjs'
import { TempTimeDisplay } from './tempTimeDisplay.mjs';
import { calculateCharacterVerticalCentre } from './utilityFunctions.mjs';
import { UserInput } from './userInput.mjs';
import { NumericWheelDisplay, NumericWheelDigit } from './numericWheelDisplay.mjs';
import { AirspeedWheel } from './airSpeedWheel.mjs';
import { AltitudeWheel } from './altitudeWheel.mjs';
import { Brightness } from './brightness.mjs';
import { TemperatureGraph } from './temperatureGraph.mjs';

//import { DrawSpecialRectangle } from './specialRectangle.mjs';

//var websocket;

// -->
//(async () => {



'use strict';
// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
// const Application = PIXI.Application,
//     //loader = PIXI.Loader.shared,
//     //resources = PIXI.Loader.shared.resources,
//     //TextureCache = PIXI.utils.TextureCache,
//     Sprite = PIXI.Sprite,
//     Rectangle = PIXI.Rectangle,
//     Graphics = PIXI.Graphics,
//     Container = PIXI.Container,
//     Text = PIXI.Text,
//     Polygon = PIXI.Polygon;


// ----------------------------------------------------------------------------

var CAN_QNH_PERIOD = 1000;   // time in milliseconds (1 second)
var last_qnh = 29.92;
var last_brightness = null;     // force a brightness change of first pass
var can_qnh_timestamp = Date.now();
var current_time_millis = Date.now();


// ----------------------------------------------------------------------------
// ---Create a Pixi Application                                             ---
// ----------------------------------------------------------------------------
// let app = new Application({
//     width: 480, 
//     height: 400,
//     antialias: true,
//     transparent: false,
//     resolution: 1
//     }
// );
const app = new Application();
await app.init({width: 480,
                height: 400
                }
);

// ----------------------------------------------------------------------------
// Create another application as a test
// This sets up a second canvas for display. This is just a test canvas
// TODO: Delete this section
// let app2 = new Application({
//     width: 480,
//     height: 400,
//     antialias: true,
//     transparent: false,
//     resolution:1
//     }
// );

// ----------------------------------------------------------------------------
// --- Add the canvas that Pixi automatically created for you to the HTML   ---
// --- document                                                             ---
// ----------------------------------------------------------------------------
document.body.appendChild(app.canvas);
//document.body.appendChild(app2.view);

// ----------------------------------------------------------------------------
// --- Create a new object to hold the data object coming from the websocket---
// ----------------------------------------------------------------------------

//TODO: Not sure if this can be deleted. Need to add a pause and see what happens
var dataObject = new Object();
dataObject.altitude = 0;
dataObject.airspeed = 0;
dataObject.pitch = 0;
dataObject.roll = 0;
dataObject.qnh = 29.92;
dataObject.vsi = 0;
dataObject.accy = 0;
dataObject.yaw = 0;
dataObject.position = 0;
dataObject.pressed = false;



// ----------------------------------------------------------------------------
// --- Connect to the websocket to recieve the data from the can bus as     ---
// --- objects.                                                             ---
// ----------------------------------------------------------------------------

var webSocketURL = "ws://" + location.host + "/ws";
var myWebSocket = new WebSocket(webSocketURL);

// listen for the 'open' event and respond with "ready"
myWebSocket.addEventListener('open', function(event){
    // Let the server know we are ready for data
    myWebSocket.send("ready")
})

// ----------------------------------------------------------------------------
// --- Load Fonts                                                           ---
// ----------------------------------------------------------------------------

var tahoma_normal_font = new FontFace('Tahoma', 'url(support/Tahoma.ttf)', {weight: 400});
var tahoma_bold_font = new FontFace('Tahoma', 'url(support/Tahoma%20Bold.ttf)', {weight: 800});

// Load the fonts asynchronously. If they load addthem to the document
tahoma_normal_font.load().then(function(loaded_face){
    document.fonts.add(loaded_face);
});
tahoma_bold_font.load().then(function(loaded_face){
    document.fonts.add(loaded_face);
})

// ----------------------------------------------------------------------------
// --- Wait for the document to report the fonts are loaded then call setup ---
// ----------------------------------------------------------------------------

// declare global variables??

var attitudeIndicator,
    altitudeWheel, 
    qnhDisplay, 
    altimeter_ribbon, 
    airspeedWheel,
    airspeedRibbon,
    vsiIndicator,
    slipBallIndicator,
    headingIndicator,
    speedDisplay,
    altitudeDisplay,
    tempTimeDisplay,
    brightness,
    egtGraph,
    chtGraph,
    userInput;

    
document.fonts.ready.then(function() {
    setup();
});

//})();

// ****************************************************************************
// ****************************************************************************

// ----------------------------------------------------------------------------
// --- END OF SCRIPT - We should be event based from this point onward      ---
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// --- Process messages received from the websocket connection              ---
// ----------------------------------------------------------------------------

myWebSocket.onmessage = function (event) {
    // parse the event.data into a data object
    // this will contain the data from the CAN bus
    dataObject = JSON.parse(event.data);
}

// ----------------------------------------------------------------------------
// This `setup` function will run when the image has loaded                 ---
// ----------------------------------------------------------------------------
function setup() {

    let x = app.screen.width;
    let y = app.screen.height;

    attitudeIndicator = new AttitudeIndicator(app);       
         
    altimeter_ribbon = new Ribbon(app, x-35, y/2, y-130, 90, true, 100, 4, 5, true, undefined, undefined, true);
    altitudeWheel = new AltitudeWheel(app) //, 755, 240);
    qnhDisplay = new QNHDisplay(app, x - (35 + 90), y-130/2+25, 90, 25, 8);
    altitudeDisplay = new AltitudeDisplay(app, x - (35 + 90), 130/2, 90, 25, 8); 

    airspeedRibbon = new AirspeedRibbon(app, 35, y/2, y-130, 90, false, 10, 8, 2, false);
    airspeedWheel = new AirspeedWheel(app, 45, y/2);
    speedDisplay = new SpeedDisplay(app, 35, 130/2, 90, 25, 8);
    tempTimeDisplay = new TempTimeDisplay(app, 35, y-130/2+25, 90, 25, 8);

    //tasDisplay = new TASDisplay(app, 35, 130/2, 90, 25, 8 )

    vsiIndicator = new VsiIndicator(app, x-35, y/2, y-80, 35);

    var aircraft = new AircraftIndicator(app);

    //slipBallIndicator = new SlipBallIndicator(app);
    headingIndicator = new HeadingIndicator(app, x, false, true );//- 260);
    //menu = new Interactions(app, x - 150, y - 40, 150, 40);

    brightness = new Brightness(app);

    //egtGraph = new TemperatureGraph(app2, 0, 200, "EGT", 1100, 1500, 0, 1400, 1400);
    //chtGraph = new TemperatureGraph(app2, 240, 200, "CHT", 100, 500, 200, 400, 450);

    userInput = new UserInput(app);

    userInput.registerCallback(qnhDisplay);
    userInput.registerCallback(tempTimeDisplay);
    userInput.registerCallback(brightness);
    userInput.registerCallback(speedDisplay);
    userInput.registerCallback(headingIndicator);
    userInput.registerCallback(altitudeDisplay);
    userInput.registerCallback(altimeter_ribbon);

    app.ticker.add(delta => DisplayUpdateLoop(delta));
}

// ----------------------------------------------------------------------------
// --- Update called by ticker to update the display                        ---
// ----------------------------------------------------------------------------


function DisplayUpdateLoop(delta) {

    attitudeIndicator.pitch = dataObject.pitch;
    attitudeIndicator.roll = dataObject.roll;
    attitudeIndicator.accY = dataObject.accy;
    attitudeIndicator.accZ = dataObject.accz;
    attitudeIndicator.updateSlipSkid();
    altitudeWheel.value = dataObject.altitude;
    //qnhDisplay.value = globalThis.qnh; // dataObject.qnh; // Don't update from json
    altimeter_ribbon.value = dataObject.altitude;
    //vsiDisplay.value = dataObject.vsi;
    //testAirspeedDisplay.value = dataObject.airspeed;
    airspeedWheel.value = dataObject.airspeed;
    airspeedRibbon.value = dataObject.airspeed;
    vsiIndicator.value = dataObject.vsi;

    //slipBallIndicator.accZ = dataObject.accz;
    //slipBallIndicator.accY = dataObject.accy;
    //slipBallIndicator.update();

    headingIndicator.value = dataObject.yaw;

    speedDisplay.groundSpeed = dataObject.gps_speed;
    speedDisplay.staticPressure = dataObject.static_pressure;
    speedDisplay.differentialPressure = dataObject.differential_pressure;
    speedDisplay.indicatedTemperature = dataObject.temperature;
    //console.log("Static P = " + dataObject.static_pressure + "| Diff P = " + dataObject.differential_pressure + "| Temp = " + dataObject.temperature);
    speedDisplay.update();
    
    tempTimeDisplay.temperature = dataObject.temperature;
    tempTimeDisplay.timeHour = dataObject.tm_hour
    tempTimeDisplay.timeMinute = dataObject.tm_min;

    tempTimeDisplay.update();

    altitudeDisplay.gpsAltitude = dataObject.gps_altitude;
    altitudeDisplay.staticPressure = dataObject.static_pressure;
    altitudeDisplay.temperature = dataObject.temperature;
    altitudeDisplay.update();

    // Process any change in the user input encoder
    userInput.processState(dataObject.position, dataObject.pressed)

    // Send the qnh value out to python using the websocket and json
    current_time_millis = Date.now();

    if (qnhDisplay.value != last_qnh || 
        current_time_millis > can_qnh_timestamp + CAN_QNH_PERIOD ||
        brightness.value != last_brightness) {
        
        last_qnh = qnhDisplay.value;
        last_brightness = brightness.value;
        can_qnh_timestamp = current_time_millis;

        var obj = {qnh: qnhDisplay.value, ticker: delta, position: dataObject.position, brightness: brightness.value};

        var json = JSON.stringify(obj);
        if (myWebSocket.readyState == 1) {
            myWebSocket.send("json" + json);}
    }

}

// ----------------------------------------------------------------------------
// --- Aircraft Indicator                                        ---
// ----------------------------------------------------------------------------

function AircraftIndicator(app){

    let displayWidth = app.screen.width;
    let displayHeight = app.screen.height;

    let px1 = displayWidth/7; // outside of large mark
    let px2 = displayWidth/25;  // offset to inside of large mark
    let px3 = displayWidth/30;
    let px4 = displayWidth/40;

    let py1 = displayHeight/8;  // Not Used
    let py2 = displayHeight/40; // height of verticals

    let lineOptions = new Object;
    lineOptions.width = 8;
    lineOptions.color = 0x000000;
    lineOptions.alpha = 1;
    lineOptions.alignment = 0.5;
    lineOptions.cap = PIXI.LINE_CAP.ROUND;
    lineOptions.join = PIXI.LINE_JOIN.ROUND;

    let aircraftGraphics = new Graphics();

    // draw black background
    aircraftGraphics.lineStyle(lineOptions);
    // large horizontal
    // aircraftGraphics.moveTo(-px1 + px2 , 0);
    // aircraftGraphics.lineTo(-px1 , 0);
    // 90 on left
    aircraftGraphics.moveTo(-px1 , 0);
    aircraftGraphics.lineTo(-1.5 * px4, 0);
    aircraftGraphics.lineTo(-1.5 * px4, py2);

    // large horizontal on right
    // aircraftGraphics.moveTo(px1, 0);
    // aircraftGraphics.lineTo(px1 - px2, 0);
    // 90 on right
    aircraftGraphics.moveTo(px1,0);//2 * px4 , 0);
    aircraftGraphics.lineTo(1.5 * px4, 0);
    aircraftGraphics.lineTo(1.5 * px4, py2);


    // draw yellow foreground
    lineOptions.width = 4;
    lineOptions.color = 0xFFFF00;

    aircraftGraphics.lineStyle(lineOptions);

    // aircraftGraphics.moveTo(-px1 + px2, 0);
    // aircraftGraphics.lineTo(-px1, 0);

    aircraftGraphics.moveTo(-px1 , 0);
    aircraftGraphics.lineTo(-1.5 * px4, 0);
    aircraftGraphics.lineTo(-1.5 * px4, py2);

    // aircraftGraphics.moveTo(px1 , 0);
    // aircraftGraphics.lineTo(px1 - px2, 0);

    aircraftGraphics.moveTo(px1, 0);
    aircraftGraphics.lineTo(1.5 * px4, 0);
    aircraftGraphics.lineTo(1.5 * px4, py2);

    // draw yellow Dot
    lineOptions.width = 1;
    lineOptions.color = 0x000000;
    lineOptions.alignment = 1;

    aircraftGraphics.lineStyle(lineOptions);

    aircraftGraphics.beginFill(0xFFFF00,1);
    aircraftGraphics.drawCircle(0,0,4);

    // draw polygon
    // let rightSidePolygon = new Polygon(0,0,px1-px2,py1,px1-px2-px3,py1);
    // let leftSidePolygon = new Polygon(0,0,-px1+px2,py1,-px1+px2+px3,py1);
    // lineOptions.color = 0x000000;
    // lineOptions.width = 1;
    // lineOptions.alignment = 1;
    // aircraftGraphics.lineStyle(lineOptions);
    // aircraftGraphics.beginFill(0xFFFF00);
    // aircraftGraphics.drawPolygon(rightSidePolygon);
    // // reverse the alignment due to reversal of drawing sequence, clockwise vs counter-clockwise
    // // this puts the line on the correct side otherwise the shape gets too large
    // lineOptions.alignment = 0;
    // aircraftGraphics.lineStyle(lineOptions);

    // aircraftGraphics.drawPolygon(leftSidePolygon);

    aircraftGraphics.x = displayWidth/2;
    aircraftGraphics.y = displayHeight/2;

    app.stage.addChild(aircraftGraphics);

}
