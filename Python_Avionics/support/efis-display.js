/*****************************************************************************
 * EFIS Display
 * This is the main module load by the index.html file.
 * The proram uses PixiJS to support the graphics display
 * 19-May-2025
 * Current PixiJS Version 8.6.6
 * version 0.1
 * 
 * 
 *****************************************************************************/
'use strict';

import { Application, Graphics } from './pixi.mjs';
// Alternative imports for PixiJS to suppor minified code ---------------------
//import { Application, Graphics } from './pixi.min.js';
//import { Application, Graphics, Container } from './pixi.min.mjs';

// Import of modules required for different aspects of the EFIS display -------
// Commented out various lines as part of update to newer PixiJS version

import { Ribbon } from './ribbon.mjs';  // Altitude Ribbon

import { AirspeedRibbon } from './airspeedRibbon.mjs';
// import { VsiIndicator } from './vsi-indicator.mjs';
import { AttitudeIndicator } from './attitude-indicator.mjs';
// import { SlipBallIndicator } from './slipBall.mjs';
import { HeadingIndicator } from './headingIndicator.mjs';
// import { Interactions } from './interaction.mjs';
import { QNHDisplay } from './qnhdisplay.mjs'; //
import { SpeedDisplay } from './speedDisplay.mjs';
import { AltitudeDisplay } from './altitudeDisplay.mjs'
// import { TempTimeDisplay } from './tempTimeDisplay.mjs';
// import { calculateCharacterVerticalCentre } from './utilityFunctions.mjs';
import { UserInput } from './userInput.mjs';
import { NumericWheelDisplay, NumericWheelDigit } from './numericWheelDisplay.mjs';
// import { AirspeedWheel } from './airSpeedWheel.mjs';
import { AltitudeWheel } from './altitudeWheel.mjs';
// import { Brightness } from './brightness.mjs';
// import { TemperatureGraph } from './temperatureGraph.mjs';

//import { DrawSpecialRectangle } from './specialRectangle.mjs';
//import { SoftButtons } from './softButtons.mjs';
//import { MagnetometerCalibrate } from './magnetometerCalibrate.mjs';

//var websocket;


// ----------------------------------------------------------------------------

var CAN_QNH_PERIOD = 1000;      // time in milliseconds (1 second)
var last_qnh = 29.92;           // default qnh
var last_brightness = null;     // force a brightness change of first pass
var can_qnh_timestamp = Date.now();     // current time
var current_time_millis = Date.now();   // current time

// ----------------------------------------------------------------------------
// ---Create a Pixi Application                                             ---
// ----------------------------------------------------------------------------

const app = new Application();  // the applicaiton object available globally
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
dataObject.magx = 0.0;
dataObject.magy = 0.0;
dataObject.magz = 0.0;

// ----------------------------------------------------------------------------
// --- Connect to the websocket to receive the data from the can bus as     ---
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

// declare global variables

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
    userInput,
    softButtons,
    magnetometerCalibrate;

// call setup after the fonts are loaded and ready
    
document.fonts.ready.then(function() {
    setup();
});

// ----------------------------------------------------------------------------
// --- Assign a function to receive WebSocket Messages                      ===
// ----------------------------------------------------------------------------

myWebSocket.onmessage = RecieveWebSocketMessage;

// ****************************************************************************
// *** END OF SCRIPT - We are event based from this point onward            ***
// ****************************************************************************


// ----------------------------------------------------------------------------
// --- Process messages received from the websocket connection              ---
// ----------------------------------------------------------------------------

function RecieveWebSocketMessage(event) {
    // parse the event.data into a data object
    // this will contain the data from the CAN bus
    dataObject = JSON.parse(event.data);
}


/*****************************************************************************
 * @brief   The setup function is called create the objects that will be
 *          drawn on the canvas.
 *****************************************************************************/
function setup() {

    let x = app.screen.width;       // canvas width
    let y = app.screen.height;      // canvas height

    //-------------------------------------------------------------------------
    // Objects are arranged back to front on the display. Create the
    // background objects first.
    // ------------------------------------------------------------------------

    //-------------------------------------------------------------------------
    // Create the Attitude indicator
    // It is centerally located on the screen.
    //-------------------------------------------------------------------------
    attitudeIndicator = new AttitudeIndicator(app);       
    
    //-------------------------------------------------------------------------
    // Create the altimeter display ribbon (vertical tape)
    //-------------------------------------------------------------------------
    altimeter_ribbon = new Ribbon(
        app,            // the current application to draw the ribbon on
        x-35, y/2,      // the location of the ribbon
        y-140, 90,      // the height and width of the ribbon
        true,           // right side if true
        100,            // Major interval size (units)
        4,              // number of major intervals in ribbon height
        5,              // number of minor devisions per major devision
        true,           // allow negative values if true
        undefined,      // colour_bar1 
        undefined,      // colour_bar2
        true);          // show adjustable setting bug if true
    
    //-------------------------------------------------------------------------
    // Create the current altitude display as a magnifier the as each of the
    // digits display as if they are on a wheel the rotate on a axis
    // parallel to the screen
    //-------------------------------------------------------------------------    
    altitudeWheel = new AltitudeWheel(app) //, 755, 240);
    
    //------------------------------------------------------------------------- 
    // Create an qnh display, generally below the airspeed ribbon that
    // displays the current qnh value in inHg
    //------------------------------------------------------------------------- 

    qnhDisplay = new QNHDisplay(
        app,                        // the current application to draw on
        x - (35 + 90), y-140/2+25,  // the location of the display
        90, 25,                     // the width and heigh of the display
        8);                         // the box's corner radius

    //------------------------------------------------------------------------- 
    // Create an altitude display, generally above the altitude ribbon, that
    // can display various altitudes that are uses selected such as GPS,
    // Pressure or Density altitude
    //------------------------------------------------------------------------- 
    altitudeDisplay = new AltitudeDisplay(
        app,                    // the current appication to draw on
        x - (35 + 90), 140/2,   // location of the altitude display
        90, 25,                 // width and height of the box
        8);                     // radius of the box's top corners

    // ------------------------------------------------------------------------
    // Create the airspeed ribbon to be displayed on the left side of the 
    // EFIS display area
    // The ribbon origin is it's center left unless the right side flag is
    // true
    // ------------------------------------------------------------------------

    airspeedRibbon = new AirspeedRibbon(
        app,            // the current application to draw the ribbon on
        35, y/2,        // the x and y location of the ribbon 
        y-140, 90,      // height and width of the ribbon
        false,          // left side if false
        10,             // major interval size (units)
        8,              // number of major intervals in ribbon height
        2,              // number of minor intervals per major
        false);         // don't allow negative numbers.

    // airspeedWheel = new AirspeedWheel(app, 45, y/2);
    
    //-------------------------------------------------------------------------
    // Create a speed display, generally above the airspeed ribbon, that can
    // display various speeds that the user selects, such as Ground Speed, and
    // True Air Speed
    //-------------------------------------------------------------------------
    speedDisplay = new SpeedDisplay(
        app,            // the current application to draw on
        35, 140/2,      // the x and y location of the display (lower left)
        90, 25,         // the width and height of the display
        8);             // the radius of the box's top corners

    // tempTimeDisplay = new TempTimeDisplay(app, 35, y-130/2+25, 90, 25, 8);

    // //tasDisplay = new TASDisplay(app, 35, 130/2, 90, 25, 8 )

    // vsiIndicator = new VsiIndicator(app, x-35, y/2, y-80, 35);

     var aircraft = new AircraftIndicator(app);

    // //slipBallIndicator = new SlipBallIndicator(app);
    headingIndicator = new HeadingIndicator(app, x);//- 260);
    // //menu = new Interactions(app, x - 150, y - 40, 150, 40);

    // brightness = new Brightness(app);

    // //egtGraph = new TemperatureGraph(app2, 0, 200, "EGT", 1100, 1500, 0, 1400, 1400);
    // //chtGraph = new TemperatureGraph(app2, 240, 200, "CHT", 100, 500, 200, 400, 450);

    userInput = new UserInput(app);
    //magnetometerCalibrate = new MagnetometerCalibrate(app);
    //softButtons = new SoftButtons(app, magnetometerCalibrate);

    userInput.registerCallback(qnhDisplay);
    // userInput.registerCallback(tempTimeDisplay);
    // userInput.registerCallback(brightness);
    userInput.registerCallback(speedDisplay);
    userInput.registerCallback(headingIndicator);
    userInput.registerCallback(altitudeDisplay);
    // userInput.registerCallback(altimeter_ribbon);
    

    app.ticker.add(delta => DisplayUpdateLoop(delta));
}

// ----------------------------------------------------------------------------
// --- Update called by ticker to update the display                        ---
// ----------------------------------------------------------------------------


function DisplayUpdateLoop(delta) {

    attitudeIndicator.pitch = dataObject.pitch;
    attitudeIndicator.roll = -dataObject.roll;
    attitudeIndicator.accY = dataObject.accy;
    attitudeIndicator.accZ = dataObject.accz;
    // attitudeIndicator.updateSlipSkid();
    altitudeWheel.value = dataObject.altitude;
    // //qnhDisplay.value = globalThis.qnh; // dataObject.qnh; // Don't update from json
    // altimeter_ribbon.value = dataObject.altitude;
    // //vsiDisplay.value = dataObject.vsi;
    // //testAirspeedDisplay.value = dataObject.airspeed;
    // airspeedWheel.value = dataObject.airspeed;
    // airspeedRibbon.value = dataObject.airspeed;
    // vsiIndicator.value = dataObject.vsi;

    // //slipBallIndicator.accZ = dataObject.accz;
    // //slipBallIndicator.accY = dataObject.accy;
    // //slipBallIndicator.update();

    headingIndicator.value = dataObject.yaw;

    // speedDisplay.groundSpeed = dataObject.gps_speed;
    // speedDisplay.staticPressure = dataObject.static_pressure;
    // speedDisplay.differentialPressure = dataObject.differential_pressure;
    // speedDisplay.indicatedTemperature = dataObject.temperature;
    // //console.log("Static P = " + dataObject.static_pressure + "| Diff P = " + dataObject.differential_pressure + "| Temp = " + dataObject.temperature);
    // speedDisplay.update();
    
    // tempTimeDisplay.temperature = dataObject.temperature;
    // tempTimeDisplay.timeHour = dataObject.tm_hour
    // tempTimeDisplay.timeMinute = dataObject.tm_min;

    // tempTimeDisplay.update();

    // altitudeDisplay.gpsAltitude = dataObject.gps_altitude;
    // altitudeDisplay.staticPressure = dataObject.static_pressure;
    // altitudeDisplay.temperature = dataObject.temperature;
    // altitudeDisplay.update();

    //magnetometerCalibrate.plotPoint(dataObject.magx,dataObject.magy,dataObject.magz);
    
    // // Process any change in the user input encoder
    userInput.processState(dataObject.position, dataObject.pressed)

    // // Send the qnh value out to python using the websocket and json
    // current_time_millis = Date.now();

    // if (qnhDisplay.value != last_qnh || 
    //     current_time_millis > can_qnh_timestamp + CAN_QNH_PERIOD ||
    //     brightness.value != last_brightness) {
        
    //     last_qnh = qnhDisplay.value;
    //     last_brightness = brightness.value;
    //     can_qnh_timestamp = current_time_millis;

    //     var obj = {qnh: qnhDisplay.value, ticker: delta, position: dataObject.position, brightness: brightness.value};

    //     var json = JSON.stringify(obj);
    //     if (myWebSocket.readyState == 1) {
    //         myWebSocket.send("json" + json);}
    // }

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

    let aircraftGraphics = new Graphics();

    aircraftGraphics.strokeStyle = {
        alignment: 0.5,
        alpha: 1,
        cap: "round",
        join: "round",
        color: 0x000000,
        width: 8,
    }

    // 90 on left
    aircraftGraphics.moveTo(-px1 , 0);
    aircraftGraphics.lineTo(-1.5 * px4, 0);
    aircraftGraphics.lineTo(-1.5 * px4, py2);

    // 90 on right
    aircraftGraphics.moveTo(px1,0);//2 * px4 , 0);
    aircraftGraphics.lineTo(1.5 * px4, 0);
    aircraftGraphics.lineTo(1.5 * px4, py2);

    aircraftGraphics.stroke();

    // draw yellow foreground
    aircraftGraphics.strokeStyle = {
        alignment: 0.5,
        alpha: 1,
        cap: "round",
        join: "round",
        color: 0xFFFF00,
        width: 4,
    }

    aircraftGraphics.moveTo(-px1 , 0);
    aircraftGraphics.lineTo(-1.5 * px4, 0);
    aircraftGraphics.lineTo(-1.5 * px4, py2);

    aircraftGraphics.moveTo(px1, 0);
    aircraftGraphics.lineTo(1.5 * px4, 0);
    aircraftGraphics.lineTo(1.5 * px4, py2);

    aircraftGraphics.stroke();

    // draw yellow Dot
    aircraftGraphics.strokeStyle = {
        alignment: 0.0,
        alpha: 1,
        cap: "round",
        join: "round",
        color: 0x000000,
        width: 2,
    }
    aircraftGraphics.fillStyle = {
        alpha: 1,
        color: 0xFFFF00,
    }

    aircraftGraphics.circle(0,0,3);

    aircraftGraphics.stroke();
    aircraftGraphics.fill();

    aircraftGraphics.x = displayWidth/2;
    aircraftGraphics.y = displayHeight/2;

    app.stage.addChild(aircraftGraphics);

}
