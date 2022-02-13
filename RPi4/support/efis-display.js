/*global PIXI */
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

//import { DrawSpecialRectangle } from './specialRectangle.mjs';


'use strict';
// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
var Application = PIXI.Application,
    loader = PIXI.Loader.shared,
    resources = PIXI.Loader.shared.resources,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Rectangle = PIXI.Rectangle,
    Graphics = PIXI.Graphics,
    Container = PIXI.Container,
    Text = PIXI.Text,
    Polygon = PIXI.Polygon;


// ----------------------------------------------------------------------------

var CAN_QNH_PERIOD = 1000;   // time in milliseconds (1 second)
var last_qnh = 29.92;
var can_qnh_timestamp = Date.now();
var current_time_millis = Date.now();


// ----------------------------------------------------------------------------
// ---Create a Pixi Application                                             ---
// ----------------------------------------------------------------------------
let app = new Application({
    width: 480, 
    height: 400,
    antialias: true,
    transparent: false,
    resolution: 1
    }
);

// ----------------------------------------------------------------------------
// Create another application as a test
// This sets up a second canvas for display. This is just a test canvas
// TODO: Delete this section
let app2 = new Application({
    width: 480,
    height: 400,
    antialias: true,
    transparent: false,
    resolution:1
    }
);

// ----------------------------------------------------------------------------
// --- Add the canvas that Pixi automatically created for you to the HTML   ---
// --- document                                                             ---
// ----------------------------------------------------------------------------
document.body.appendChild(app.view);
document.body.appendChild(app2.view);

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
    userInput;


//var qnh;
    
document.fonts.ready.then(function() {
    setup();
});

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

    //vsiDisplay = new VSIDisplay(app);
    //testAirspeedDisplay = new ASDisplay(app);
 

    airspeedRibbon = new AirspeedRibbon(app, 35, y/2, y-130, 90, false, 10, 8, 2, false);
    airspeedWheel = new AirspeedWheel(app, 45, y/2);
    speedDisplay = new SpeedDisplay(app, 35, 130/2, 90, 25, 8);
    tempTimeDisplay = new TempTimeDisplay(app, 35, y-130/2+25, 90, 25, 8);

    //tasDisplay = new TASDisplay(app, 35, 130/2, 90, 25, 8 )

    vsiIndicator = new VsiIndicator(app, x-35, y/2, y-80, 35);

    var aircraft = new AircraftIndicator(app);

    slipBallIndicator = new SlipBallIndicator(app);
    headingIndicator = new HeadingIndicator(app, x );//- 260);
    //menu = new Interactions(app, x - 150, y - 40, 150, 40);

    userInput = new UserInput(app);

    userInput.registerCallback(qnhDisplay);
    userInput.registerCallback(tempTimeDisplay);
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
    attitudeIndicator.accy = dataObject.accy;
    altitudeWheel.value = dataObject.altitude;
    //qnhDisplay.value = globalThis.qnh; // dataObject.qnh; // Don't update from json
    altimeter_ribbon.value = dataObject.altitude;
    //vsiDisplay.value = dataObject.vsi;
    //testAirspeedDisplay.value = dataObject.airspeed;
    airspeedWheel.value = dataObject.airspeed;
    airspeedRibbon.value = dataObject.airspeed;
    vsiIndicator.value = dataObject.vsi;

    slipBallIndicator.accZ = dataObject.accz;
    slipBallIndicator.accY = dataObject.accy;
    slipBallIndicator.update();

    headingIndicator.value = dataObject.yaw;

    speedDisplay.groundSpeed = dataObject.gps_speed;
    speedDisplay.update();
    tempTimeDisplay.temperature = dataObject.temperature;
    tempTimeDisplay.timeHour = dataObject.tm_hour
    tempTimeDisplay.timeMinute = dataObject.tm_min;

    tempTimeDisplay.update();

    altitudeDisplay.gpsAltitude = dataObject.gps_altitude;
    altitudeDisplay.update();

    // Process any change in the user input encoder
    userInput.processState(dataObject.position, dataObject.pressed)

    // Send the qnh value out to python using the websocket and json
    current_time_millis = Date.now();

    if (qnhDisplay.value != last_qnh || current_time_millis > can_qnh_timestamp + CAN_QNH_PERIOD) {
        
        last_qnh = qnhDisplay.value;
        can_qnh_timestamp = current_time_millis;

        var obj = {qnh: qnhDisplay.value, ticker: delta, position: dataObject.position};

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
    lineOptions.width = 6;
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




/** ---------------------------------------------------------------------------
 * @brief AirspeedWheel Constructor function.
 * 
 * @param app The application in which to display the AirspeedWheel
 * @param x   The x location for the left side of the AirspeedWheel 
 * @param y   The y location for the centre of the AirSpeedWheel
 * ----------------------------------------------------------------------------
 */

function AirspeedWheel(app, x, y){




    // Create wheel elements for the digits in the airspeed

    this.airspeedHundredsWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 2, false, 1, false, false, x, y);

    let airspeedTensWheelX = x + this.airspeedHundredsWheel.digitWidth;
    
    this.airspeedTensWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 1, false, 1, false, false, airspeedTensWheelX, y);

    let airspeedOnesWheelX = airspeedTensWheelX + this.airspeedTensWheel.digitWidth;
    this.airspeedOnesWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 0, false, 1, false, false, airspeedOnesWheelX, y);

    let airspeedWidth = this.airspeedOnesWheel.digitWidth + this.airspeedTensWheel.digitWidth + this.airspeedHundredsWheel.digitWidth;

    airspeedWheelOutline(app, x ,y , airspeedWidth, 15);

    // Add text for kts
    // Create a style to be used for the units characters
    this.style = new PIXI.TextStyle({
        fontFamily: 'Tahoma',
        fontSize: '18px',
        fill: "white",
        fontWeight: "normal",
        stroke: "black",
        strokeThickness: 2
    });

    this.IASunits = new PIXI.Text("kts", this.style);
    this.IASunits.anchor.set(0,.2);
    this.IASunits.position.set(x + airspeedWidth + 8,y);

    // this.style = new PIXI.TextStyle({
    //     fontFamily: 'Tahoma',
    //     fontSize: '14px',
    //     fill: "white",
    //     fontWeight: "normal",
    //     stroke: "black",
    //     strokeThickness: 2
    // });

    // this.IASlegend = new PIXI.Text("IAS", this.style);
    // this.IASlegend.anchor.set(0,.15);
    // this.IASlegend.position.set(x + airspeedWidth + 8, y );

    app.stage.addChild(this.IASunits);
    //app.stage.addChild(this.IASlegend);
    app.stage.addChild(this.airspeedOnesWheel.digitContainer);
    app.stage.addChild(this.airspeedTensWheel.digitContainer);
    app.stage.addChild(this.airspeedHundredsWheel.digitContainer);

}

Object.defineProperties( AirspeedWheel.prototype, {
    value: { 
        set: function(value) {
            this.airspeedOnesWheel.value = value;
            this.airspeedTensWheel.value = value;
            this.airspeedHundredsWheel.value = value;
        }
    }
})

function airspeedWheelOutline(app,x,y,width,height){
    let line = new Graphics();
    line.lineStyle(2,0xFFFFFF);
    line.beginFill(0x000000);
    // strart drawing the point
    line.moveTo(x-6,y);
    line.lineTo(x-1,y-5);
    // draw box
    line.lineTo(x-1,y-(1+height));
    line.lineTo(x+(1+width),y-(1+height));
    line.lineTo(x+(1+width),y+(1+height));
    line.lineTo(x-1,y+(1+height));
    // complete the point
    line.lineTo(x-1,y+5);
    line.lineTo(x-6,y);
    line.endFill();

    app.stage.addChild(line);

}

// ----------------------------------------------------------------------------
// --- AltitudeWheel object                                                 ---
// ----------------------------------------------------------------------------

function AltitudeWheel(app){
    //this.x = x;
    //this.y = y;
    // position based on screen size
    this.x = app.screen.width - 45;
    this.y = app.screen.height / 2;
    this.app = app;

    //console.log("construct alt tens");
    this.tensWheel = new NumericWheelDisplay("Tahoma", 28, 1489/2048, 30, 1 ,false, 20, true, true, this.x, this.y);

    let hundredsWheelX = this.x - this.tensWheel.digitWidth;
    this.hundredsWheel = new NumericWheelDisplay("Tahoma", 28, 1489/2048, 30, 2, false, 1, true, true, hundredsWheelX, this.y);

    let thousandsWheelX = hundredsWheelX - this.hundredsWheel.digitWidth;
    this.thousandsWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 3, false, 1, true, true, thousandsWheelX, this.y);

    let tenThousandsWheelX = thousandsWheelX - this.thousandsWheel.digitWidth;
    this.tenThousandsWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 4, true, 1, true, true, tenThousandsWheelX, this.y);

    let width = this.tensWheel.digitWidth + this.hundredsWheel.digitWidth + this.thousandsWheel.digitWidth + this.tenThousandsWheel.digitWidth;
    let width1 = this.tensWheel.digitWidth;

    AltitudeWheelOutline(app, this.x, this.y, true, width, 30/2 , width1, (30/2 + 20) );

    this.app.stage.addChild(this.tensWheel.digitContainer);
    this.app.stage.addChild(this.hundredsWheel.digitContainer);
    this.app.stage.addChild(this.thousandsWheel.digitContainer);
    this.app.stage.addChild(this.tenThousandsWheel.digitContainer);
}

function AltitudeWheelOutline(app,x,y,right,width,height,left_width,left_height){
    let line = new Graphics();
    line.lineStyle(2,0xFFFFFF);
    line.beginFill(0x000000);
    // strart drawing the point
    line.moveTo(x+6,y);
    line.lineTo(x+1,y-5);
    // draw right side box
    line.lineTo(x+1,y-(1+left_height));
    line.lineTo(x-(1+left_width),y-(1+left_height));
    line.lineTo(x-(1+left_width),y-(1+height));
    // draw left side box
    line.lineTo(x-(1+width),y-(1+height));
    line.lineTo(x-(1+width),y+(2+height));
    line.lineTo(x-(1+left_width),y+(2+height));
    // draw right side box
    line.lineTo(x-(1+left_width),y+(1+left_height));
    line.lineTo(x+1,y+(1+left_height));
    // complete the point
    line.lineTo(x+1,y+5);
    line.lineTo(x+6,y);
    line.endFill();

    app.stage.addChild(line);

}

function drawSpecialRectangle(graphic, x, y, width, height, radius, 
    topLeftRounded, topRightRounded, bottomRightRounded, bottomLeftRounded) {

    if (topLeftRounded) {
        graphic.moveTo(x, y + radius);
        graphic.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI);
    } else {
        graphic.moveTo(x,y);
    }

    if (topRightRounded) {
        graphic.lineTo(x + width - radius, y);
        graphic.arc(x + width - radius, y + radius, radius, 1.5 * Math.PI, 0);
    } else {
        graphic.lineTo(x + width, y);
    }

    if (bottomRightRounded) {
        graphic.lineTo(x + width, y + height - radius);
        graphic.arc(x + width - radius, y + height - radius, radius, 0, .5 * Math.PI);
    } else {
        graphic.lineTo(x + width, y + height);
    }

    if (bottomLeftRounded) {
        graphic.lineTo(x + radius, y + height);
        graphic.arc(x + radius, y + height - radius, radius, .5 * Math.PI, Math.PI)
    } else {
        graphic.lineTo(x, y + height);
    }

    if (topLeftRounded) {
        graphic.lineTo(x, y + radius);
    } else {
        graphic.lineTo(x,y);
    }

    
}

Object.defineProperties( AltitudeWheel.prototype, {
    value: { 
        set: function(value) {
            //console.log("alt tens");
            this.tensWheel.value = value;
            //console.log("alt hundreds");
            this.hundredsWheel.value = value;
            //console.log("alt thousands");
            this.thousandsWheel.value = value;
            //console.log("alt tenthousands");
            this.tenThousandsWheel.value = value;
        }
    }
})

