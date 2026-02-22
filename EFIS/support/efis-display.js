/*****************************************************************************
 * EFIS Display
 * This is the main module load by the index.html file.
 * The proram uses PixiJS to support the graphics display
 * 19-May-2025
 * Current PixiJS Version 8.6.6
 * version 0.1
 * 
 *****************************************************************************/
'use strict';

import { Application, Graphics, Text, TextStyle } from './pixi.mjs';
// Alternative imports for PixiJS to support minified code --------------------
//import { Application, Graphics } from './pixi.min.js';
//import { Application, Graphics, Container } from './pixi.min.mjs';

// Import of modules required for different aspects of the EFIS display -------
// Commented out various lines as part of update to newer PixiJS version

import { Ribbon } from './ribbon.mjs';  // Altitude Ribbon

import { AirspeedRibbon } from './airspeedRibbon.mjs';
import { VsiIndicator } from './vsi-indicator.mjs';
import { AttitudeIndicator } from './attitude-indicator.mjs';
import { SlipBallIndicator } from './slipBall.mjs';
import { HeadingIndicator } from './headingIndicator.mjs';
import { QNHDisplay } from './qnhdisplay.mjs'; //
import { SpeedDisplay } from './speedDisplay.mjs';
import { AltitudeDisplay } from './altitudeDisplay.mjs'
import { TempTimeDisplay } from './tempTimeDisplay.mjs';
// import { calculateCharacterVerticalCentre } from './utilityFunctions.mjs';
import { UserInput } from './userInput.mjs';
import { AirspeedWheel } from './airSpeedWheel.mjs';
import { AltitudeWheel } from './altitudeWheel.mjs';
import { Brightness } from './brightness.mjs';
import { TurnRateIndicator } from './turnRateIndicator.mjs';

import { SoftButtons } from './softButtons.mjs';
import { MenuOverlay } from './menuOverlay.mjs';
import { HSI } from './hsi.mjs';
import { RouteOverlay } from './routeOverlay.mjs';



// ----------------------------------------------------------------------------

var CAN_QNH_PERIOD = 1000;      // time in milliseconds (1 second)
// last_qnh stores QNH in inHg × 100 format (e.g., 2992 = 29.92 inHg)
var last_qnh = 2992;            // default qnh (29.92 inHg × 100)
var last_brightness = null;     // force a brightness change of first pass
var can_qnh_timestamp = Date.now();     // current time
var current_time_millis = Date.now();   // current time

// Turn rate spring-mass-damper filter variables
// Simulates mechanical gyroscope inertia: mass resists sudden changes,
// spring pulls toward actual value, damping prevents oscillation
var smoothedTurnRate = 0.0;     // Current displayed turn rate (position)
var turnRateVelocity = 0.0;     // Rate of change of displayed value
var turnRateSpring = 8.0;       // Spring constant - how strongly it tracks the input
var turnRateDamping = 4.5;      // Damping constant - slightly underdamped for realistic feel
                                // Critical damping = 2 * sqrt(spring) ≈ 5.66, using 4.5 for slight underdamp

// TEST: Set to true to sweep airspeed 0-200 for testing color bands
var TEST_AIRSPEED_SWEEP = false;
var testAirspeed = 0;
var testAirspeedDir = 1;

// ----------------------------------------------------------------------------
// ---Create a Pixi Application                                             ---
// ----------------------------------------------------------------------------

const screenW = window.innerWidth;
const screenH = window.innerHeight;

let width = screenW;
let height = screenH;

if (screenH > screenW) {
  // Portrait → top half
  height = screenH / 2;
} else {
  // Landscape → left half
  width = screenW / 2;
}
const app = new Application();  // the applicaiton object available globally
await app.init({width: width,
                height: height
                }
);

// ----------------------------------------------------------------------------
// Create another application as a test
// This sets up a second canvas for display. This is just a test canvas
// TODO: Delete this section
// This will create a blank canvas that is black at the bottom or side of the
// screen.
const app2 = new Application();
await app2.init({width: width,
                height: height
                }
);

// ----------------------------------------------------------------------------
// --- Add the canvas that Pixi automatically created for you to the HTML   ---
// --- document                                                             ---
// ----------------------------------------------------------------------------
document.body.appendChild(app.canvas);
document.body.appendChild(app2.canvas);

// --- HSI on the second canvas ---
let hsiDiameter = Math.min(app2.screen.width, app2.screen.height) * 0.75;
hsi = new HSI(app2, app2.screen.width / 2, app2.screen.height / 2, hsiDiameter);

// --- Route overlay and button ---
function sendCommand(cmd) {
    if (myWebSocket.readyState == 1) {
        myWebSocket.send("json" + JSON.stringify(cmd));
    }
}
let routeOverlay = new RouteOverlay(app2, sendCommand);

// "Route" button — lower right corner of HSI canvas, matching Menu button style
let routeBtnWidth = 90;
let routeBtnHeight = 38;
let routeBtnMargin = 1;
const routeBtn = new SoftButtons(app2, {
    addContainer() {
        routeOverlay.toggle();
        routeBtn.clearNotification();
    }
}, {
    x: app2.screen.width - routeBtnWidth - routeBtnMargin,
    y: app2.screen.height - 40 + routeBtnMargin,
    width: routeBtnWidth,
    height: routeBtnHeight + 2 * routeBtnMargin,
    text: "Route"
});
let _lastRouteLen = undefined;
let _lastActiveLeg = undefined;

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
    menuOverlay,
    hsi,
    magnetometerCalibrate,
    turnRateIndicator,
    turnRateDebugText;

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
        x - (35), y-140/2,          // the location of the display
        90, 25,                     // the width and heigh of the display
        8);                         // the box's corner radius

    //------------------------------------------------------------------------- 
    // Create an altitude display, generally above the altitude ribbon, that
    // can display various altitudes that are uses selected such as GPS,
    // Pressure or Density altitude
    //------------------------------------------------------------------------- 
    altitudeDisplay = new AltitudeDisplay(
        app,                    // the current appication to draw on
        x - (35), 140/2,        // location of the altitude display
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
        0, y/2,         // the x and y location of the ribbon
        y-140, 90,      // height and width of the ribbon
        false,          // left side if false
        10,             // major interval size (units)
        8,              // number of major intervals in ribbon height
        2,              // number of minor intervals per major
        false);         // don't allow negative numbers.

    airspeedWheel = new AirspeedWheel(app, 12, y/2);
    
    //-------------------------------------------------------------------------
    // Create a speed display, generally above the airspeed ribbon, that can
    // display various speeds that the user selects, such as Ground Speed, and
    // True Air Speed
    //-------------------------------------------------------------------------
    speedDisplay = new SpeedDisplay(
        app,            // the current application to draw on
        0, 140/2,       // the x and y location of the display (lower left)
        90, 25,         // the width and height of the display
        8);             // the radius of the box's top corners

    
    //-------------------------------------------------------------------------
    // Create a display below the speed ribbon to display the time or the OAT
    //-------------------------------------------------------------------------
    tempTimeDisplay = new TempTimeDisplay(
        app, 
        0, y-140/2, // was + 25 for the height
        90, 25, 
        8);

    //-------------------------------------------------------------------------
    // Create a VSI Indicator
    // Position the indicators origin 35 pixels from the left edge of the
    // screen and vertically centered on the screen.
    // The VSI indicator is 35 pixels wide and 80 pixels tall.
    //-------------------------------------------------------------------------
    vsiIndicator = new VsiIndicator(
        app,            // the current application to draw on          
        x-35, y/2,      // the x and y location of the VSI indicator
        y-80, 35);      // the width and height of the VSI indicator

     var aircraft = new AircraftIndicator(app);

    slipBallIndicator = new SlipBallIndicator(app);
    turnRateIndicator = new TurnRateIndicator(app, app.screen.width / 2, app.screen.height - 19);
    headingIndicator = new HeadingIndicator(app, x);//- 260);

    brightness = new Brightness(app);

    // ------------------------------------------------------------------------
    // The following is for an EMS display - Not currently being implemented
    // ------------------------------------------------------------------------
    // //egtGraph = new TemperatureGraph(app2, 0, 200, "EGT", 1100, 1500, 0, 1400, 1400);
    // //chtGraph = new TemperatureGraph(app2, 240, 200, "CHT", 100, 500, 200, 400, 450);
    //-------------------------------------------------------------------------

    userInput = new UserInput(app);

    // --- Menu overlay with toggle items ---
    const toggleDefs = [
        {
            label: "Airspeed Sweep",
            getState: () => TEST_AIRSPEED_SWEEP,
            setState: (val) => { TEST_AIRSPEED_SWEEP = val; },
        },
        {
            label: "Encoder Debug",
            getState: () => userInput.itemSelectorText
                ? userInput.itemSelectorText.visible : false,
            setState: (val) => { userInput.setDebugVisible(val); },
        },
    ];

    menuOverlay = new MenuOverlay(app, toggleDefs);

    const menuCallback = {
        addContainer() {
            menuOverlay.toggle();
        }
    };

    // Menu button — lower right corner, between ribbon bottom and canvas edge
    let btnMargin = 1;
    let btnHeight = 40 - 2 * btnMargin;  // 38px
    let btnWidth = 90;
    softButtons = new SoftButtons(app, menuCallback, {
        x: x - btnWidth - btnMargin,
        y: y - 40 + btnMargin,
        width: btnWidth,
        height: btnHeight
    });

    // Create debug text for turn rate (commented out - uncomment to debug)
    // let turnRateTextStyle = new TextStyle({
    //     fontFamily: 'Tahoma',
    //     fontSize: '20px',
    //     fill: "white",
    //     fontWeight: "normal"
    // });
    // turnRateDebugText = new Text({
    //     text: "TR: 0.0",
    //     style: turnRateTextStyle
    // });
    // turnRateDebugText.position.set(10, app.screen.height - 60);
    // app.stage.addChild(turnRateDebugText);

    userInput.registerCallback(qnhDisplay);
    userInput.registerCallback(tempTimeDisplay);
    userInput.registerCallback(brightness);
    userInput.registerCallback(speedDisplay);
    userInput.registerCallback(headingIndicator);
    userInput.registerCallback(altitudeDisplay);
    userInput.registerCallback(altimeter_ribbon);
    userInput.registerCallback(hsi);

    app.ticker.add(delta => DisplayUpdateLoop(delta));
}

// ----------------------------------------------------------------------------
// --- Update called by ticker to update the display                        ---
// ----------------------------------------------------------------------------


function DisplayUpdateLoop(delta) {

    // Data arrives in NED frame from Arduino, no corrections needed here
    attitudeIndicator.pitch = dataObject.pitch;
    attitudeIndicator.roll = dataObject.roll;
    attitudeIndicator.accY = dataObject.accy;
    attitudeIndicator.accZ = dataObject.accz;
    // attitudeIndicator.updateSlipSkid();
    altitudeWheel.value = dataObject.altitude;
    // //qnhDisplay.value = globalThis.qnh; // dataObject.qnh; // Don't update from json
    altimeter_ribbon.value = dataObject.altitude;
    // //vsiDisplay.value = dataObject.vsi;
    // //testAirspeedDisplay.value = dataObject.airspeed;
    if (TEST_AIRSPEED_SWEEP) {
        // TEST: Sweep airspeed 0→200→0 to verify color bands
        testAirspeed += testAirspeedDir * 0.3;
        if (testAirspeed >= 200) testAirspeedDir = -1;
        if (testAirspeed <= 0) testAirspeedDir = 1;
        airspeedWheel.value = testAirspeed;
        airspeedRibbon.value = testAirspeed;
    } else {
        airspeedWheel.value = dataObject.airspeed;
        airspeedRibbon.value = dataObject.airspeed;
    }
    vsiIndicator.value = dataObject.vsi;
    // Temporary test - uncomment to test VSI indicator
    // vsiIndicator.value = 500; // Test with 500 fpm climb

    slipBallIndicator.accZ = dataObject.accz;
    slipBallIndicator.accY = dataObject.accy;
    slipBallIndicator.update();

    headingIndicator.value = dataObject.yaw;
    hsi.heading = dataObject.yaw;
    if (dataObject.true_track !== undefined) {
        hsi.groundTrack = dataObject.true_track;
    }
    if (dataObject.gps_speed !== undefined) {
        hsi.groundSpeed = dataObject.gps_speed;
    }
    if (dataObject.gps_fix_quality !== undefined) {
        hsi.gpsFixQuality = dataObject.gps_fix_quality;
        hsi.gpsSatellites = dataObject.gps_satellites;
        hsi.gpsHdop = dataObject.gps_hdop;
        hsi.gpsVdop = dataObject.gps_vdop;
    }
    if (dataObject.xtrack !== undefined && dataObject.xtrack !== null) {
        hsi.courseDeviation = dataObject.xtrack;
    }
    if (dataObject.to_from !== undefined && dataObject.to_from !== null) {
        hsi.toFrom = dataObject.to_from;
    }
    if (dataObject.dtk !== undefined && dataObject.dtk !== null) {
        hsi.desiredTrack = dataObject.dtk;
    } else {
        hsi.desiredTrack = null;
    }
    if (dataObject.dist !== undefined && dataObject.dist !== null) {
        hsi.waypointDistance = dataObject.dist;
    } else {
        hsi.waypointDistance = null;
    }
    if (dataObject.wpt_id !== undefined && dataObject.wpt_id !== null) {
        hsi.waypointId = dataObject.wpt_id;
    } else {
        hsi.waypointId = null;
    }
    if (dataObject.route_waypoints !== undefined) {
        routeOverlay.update(dataObject.route_waypoints, dataObject.active_leg);
        // Show notification dot when route loads/changes or active leg changes
        const routeLen = dataObject.route_waypoints ? dataObject.route_waypoints.length : 0;
        if (routeLen !== _lastRouteLen || dataObject.active_leg !== _lastActiveLeg) {
            if (routeLen > 0) routeBtn.showNotification();
            _lastRouteLen = routeLen;
            _lastActiveLeg = dataObject.active_leg;
        }
    }

    // Update turn rate using spring-mass-damper model (simulates gyro inertia)
    if (dataObject.turn_rate !== undefined) {
        // dt from PixiJS ticker (seconds)
        var dt = delta.deltaMS / 1000.0;

        // Spring-mass-damper: F = -spring*(position - target) - damping*velocity
        var acceleration = -turnRateSpring * (smoothedTurnRate - dataObject.turn_rate)
                           - turnRateDamping * turnRateVelocity;
        turnRateVelocity += acceleration * dt;
        smoothedTurnRate += turnRateVelocity * dt;

        // Update turn rate indicator bar
        turnRateIndicator.update(smoothedTurnRate);

        // Show both raw and filtered values for comparison (commented out - uncomment to debug)
        // turnRateDebugText.text = "TR Raw: " + dataObject.turn_rate.toFixed(2) +
        //                          " | Gyro: " + smoothedTurnRate.toFixed(2);
    }

    if (dataObject.gps_speed != null) {
        speedDisplay.groundSpeed = dataObject.gps_speed;
    }
    // TAS requires OAT sensor — disabled until CAN 0x2B format mismatch is fixed
    // (AIR module sends staticTemp as int16 °C×10 in bytes 2-3, but server
    //  reads byte 2 as int8 temperature and bytes 3-4 as differential_pressure)
    // speedDisplay.staticPressure = dataObject.static_pressure;
    // speedDisplay.differentialPressure = dataObject.differential_pressure;
    // speedDisplay.indicatedTemperature = dataObject.temperature;
    speedDisplay.update();

    // Temperature from 0x2B is garbled (format mismatch) — disable until fixed
    // tempTimeDisplay.temperature = dataObject.temperature;
    if (dataObject.tm_hour != null && dataObject.tm_min != null) {
        tempTimeDisplay.timeHour = dataObject.tm_hour;
        tempTimeDisplay.timeMinute = dataObject.tm_min;
    }
    tempTimeDisplay.update();

    altitudeDisplay.gpsAltitude = dataObject.gps_altitude;
    if (dataObject.static_pressure != null) {
        altitudeDisplay.staticPressure = dataObject.static_pressure;
    }
    // Density altitude requires OAT — disabled until CAN 0x2B format is fixed
    // altitudeDisplay.temperature = dataObject.temperature;
    altitudeDisplay.update();

    //magnetometerCalibrate.plotPoint(dataObject.magx,dataObject.magy,dataObject.magz);
    
    // // Process any change in the user input encoder
    userInput.processState(dataObject.position, dataObject.pressed)

    // Send the qnh value out to python using the websocket and json
    current_time_millis = Date.now();

    if (qnhDisplay.value != last_qnh || 
        current_time_millis > can_qnh_timestamp + CAN_QNH_PERIOD ||
        brightness.value != last_brightness) {
        
        last_qnh = qnhDisplay.value;
        last_brightness = brightness.value;
        can_qnh_timestamp = current_time_millis;

        // Extract values safely to avoid circular references
        // qnhValue is in inHg × 100 format (e.g., 2992 = 29.92 inHg)
        var qnhValue = 2992; // default value (29.92 inHg × 100)
        var tickerValue = 0;   // default value
        var brightnessValue = 100; // default value
        
        try {
            // Safely extract qnh value (qnhDisplay.value returns inHg × 100 format)
            if (qnhDisplay && typeof qnhDisplay.value === 'number') {
                qnhValue = qnhDisplay.value;
            }
            
            // Safely extract ticker value
            if (typeof delta === 'number') {
                tickerValue = delta;
            }
            
            // Safely extract brightness value
            if (brightness && typeof brightness.value === 'number') {
                brightnessValue = brightness.value;
            }
        } catch (e) {
            console.warn("Error extracting values:", e);
        }
        
        // Create a clean object with only primitive values
        // Note: qnh is in inHg × 100 format (e.g., 2992 = 29.92 inHg)
        var obj = {
            qnh: qnhValue,
            ticker: tickerValue,
            brightness: brightnessValue
        };

        try {
            var json = JSON.stringify(obj);
        } catch (error) {
            console.error("JSON.stringify error:", error);
            console.log("Object being serialized:", obj);
            // Fallback to a simple object if serialization fails
            // Note: qnh is in inHg × 100 format (2992 = 29.92 inHg)
            var json = JSON.stringify({qnh: 2992, ticker: 0, brightness: 100});
        }
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
