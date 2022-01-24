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
import { AltitudeDisplay } from './altitudeDisplay.mjs';
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
    tasDisplay,
    vsiDisplay, 
    altimeter_ribbon, 
    testAirspeedDisplay, 
    airspeedWheel,
    airspeedRibbon,
    vsiIndicator,
    slipBallIndicator,
    headingIndicator,
    speedDisplay,
    altitudeDisplay,
    menu,
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
    //tasDisplay = new TASDisplay(app, 35, 130/2, 90, 25, 8 )

    vsiIndicator = new VsiIndicator(app, x-35, y/2, y-80, 35);

    var aircraft = new AircraftIndicator(app);

    slipBallIndicator = new SlipBallIndicator(app);
    headingIndicator = new HeadingIndicator(app, x );//- 260);
    //menu = new Interactions(app, x - 150, y - 40, 150, 40);

    userInput = new UserInput(app);

    //TODO: remove this later. This is a callback test 
    var myCallBackClass = new MyCallBackClass();

    userInput.registerCallback(qnhDisplay);
    userInput.registerCallback(speedDisplay);
    userInput.registerCallback(headingIndicator);
    userInput.registerCallback(altitudeDisplay);
    userInput.registerCallback(altimeter_ribbon);
    // userInput.registerCallback(myCallBackClass);
    // userInput.registerCallback(myCallBackClass);

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
    slipBallIndicator.acc = dataObject.accy;
    headingIndicator.value = dataObject.yaw;

    speedDisplay.groundSpeed = dataObject.gps_speed;
    speedDisplay.update();

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
class MyCallBackClass{
    callback(selected, change, encoder){
        // nothing to do here
    }
}



// ----------------------------------------------------------------------------
// --- User Input                                                           ---
// ----------------------------------------------------------------------------
/*
The goal of this function is allow you to use the selector button to toggle
between two modes. Mode 0 is to select between different UI elements to adjust
and Mode 1 is to adjust the element
Ideally this class will be generic and allow you to add UI elements to it
with call backs to indicated whether the UI element is selected for adjustment
and to pass on adjustements to the UI element
*/

class UserInput {

    constructor(app) {
        this.encoderPosition = 0;
        this.encoderButton = false;
        this.lastButton = this.encoderButton;
        this.lastPosition = this.encoderPosition;

        this.itemSelectionMode = false;
        this.firstPass = true;

        // storage for call back and virtual encoder
        this.numberOfCallbacksRegistered = 0;
        this.callbackFunction = new Array();
        this.virtualEncoderValue = new Array();
        this.currentSelection = 0;      // currently selected callback
        this.encoderAdjustment = 0;     // adjustement of encoder position
        this.virtualEncoderForSelection = 0;
        
        // TODO: Remove this later. It is for testing 
        this.emptyCircle = new Graphics();
        this.filledCircle = new Graphics();

        let displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;

        // draw a circle in the lower left corner
        this.emptyCircle.lineStyle(1, 0xffffff, 1);
        this.emptyCircle.drawCircle(5, this.displayHeight - 5, 4);

        // draw a filled circle in the lower left corner
        this.filledCircle.lineStyle(1, 0xffffff, 1);
        //this.filledCircle.beginFill(0xffffff, 1);
        this.filledCircle.drawCircle(5, this.displayHeight -5 , 4);
        //this.filledCircle.endFill();

        // The following is for debugging
        // create text for the screen
        this.style = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '20px',
            fill: "white",
            fontWeight: "normal"
        });

        this.itemSelectorText = new Text("0", this.style);
        this.itemSelectorText.anchor.set(0,1);
        this.itemSelectorText.position.set(10, this.displayHeight);

        this.encoderText = new Text("0", this.style);
        this.encoderText.anchor.set(0,1);
        this.encoderText.position.set(40, this.displayHeight);


        app.stage.addChild(this.filledCircle);
        app.stage.addChild(this.itemSelectorText);
        app.stage.addChild(this.encoderText);
        this.app = app;
        //TODO: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Remove
    }

    /**
     *  processState: processes the encoder position and button to all 
     *  adjustment of multiple objects
     * 
     * @param {number} position 
     * @param {boolean} button The state of the encoder push button. True is 
     *     depressed. False is released.
     */


    processState(position, button) {
        var encoderPosition;

        // TODO: Rewrite the following to simply depend on the numberOfCallbacksRegistered

        // handle first time through until there is a call back registered
        if (this.firstPass) {
            // save the current encoder position
            this.encoderAdjustment = position;

            // check if we have any registered callbacks
            if (this.numberOfCallbacksRegistered > 0) {

                this.firstPass = false;
            }

        // All regular processing happens here
        } else {
            // We have at least one call back registered
            
            /******************************************************************
             * Handle changes to the push button state first                  *
             ******************************************************************/

            // Check if the button has changed
            if (button != this.lastButton) {

                this.lastButton = button
                if (button == false) {
                    // The button was just released therefore the item selection
                    // mode just changed.
                    // Toggle the item selection mode
                    this.itemSelectionMode = !this.itemSelectionMode
                    
                    // Process the current selection Mode
                    if (this.itemSelectionMode) {
                        // We have entered selection mode which means we can
                        // selected between the items that have been registered

                        // Unselect previous item if there are any
                        if (this.numberOfCallbacksRegistered > 0 ) {
                            this.callbackFunction[this.currentSelection].callback(
                                true,   // The item is selected
                                false,  // The item cannot be adjusted
                                0       // The position should be ignored
                            );
                        }

                        // Save the virtual encoder position for the item that is currently selected

                        // position: is the current encoder position
                        // this.virtualEncoderValue[]: holds the last virtual position
                        // this.encoderAdjustment: was the encoder value when this item was selected

                        encoderPosition = (position + 
                            this.virtualEncoderValue[this.currentSelection] -
                            this.encoderAdjustment);
                        this.virtualEncoderValue[this.currentSelection] = encoderPosition;

                    } else {
                        // We have exited selection mode which means 
                        // The currently selected item can be adjusted

                        // save the encoder position so that we can start
                        // at the same place when we return to selection mode
                        this.virtualEncoderForSelection = (position +
                            this.virtualEncoderForSelection -
                            this.encoderAdjustment);
                        
                        // Make the current selected item adjustable
                        if (this.numberOfCallbacksRegistered > 0 ) {
                            this.callbackFunction[this.currentSelection].callback(
                                true,  // The item is selected
                                true,  // The item can be adjusted
                                this.virtualEncoderValue[this.currentSelection]  // last saved encoder value
                            );
                        }

                    }
                    // save the current encoder position to be applied
                    // as the encoder makes adjustments
                    this.encoderAdjustment = position
                }
            }

            /******************************************************************
             * Handle changes to the encode position after the button state   *
             ******************************************************************/

            // Check if the position has changed
            if (position != this.lastPosition) {
                // Handle changes in the position of the encoder
                if (this.itemSelectionMode) {
                    // We are in selection mode
                    // check if the encoder has moved

                    // calculate new encoder position

                    encoderPosition = (position + 
                                            this.virtualEncoderForSelection -
                                            this.encoderAdjustment);
                    // deslect item
                    this.callbackFunction[this.currentSelection].callback(
                        false,  // item is not selected
                        false,  // item cannot be adjusted
                        0       // should be ignored
                    );

                    let remainder = encoderPosition % this.numberOfCallbacksRegistered;
                    if (remainder < 0) {
                        remainder = remainder + this.numberOfCallbacksRegistered;
                    }
                    this.currentSelection = remainder;



                    // select item
                    this.callbackFunction[this.currentSelection].callback(
                        true,   // item is selected
                        false,  // item cannot be adjusted
                        0       // should be ignored
                    );

                    // TODO: debugging output
                    // Output the currently selected item
                    this.itemSelectorText.text = this.currentSelection.toString();
                    // Calculate and display the encoder value for the item
                    let itemEncoderPosition = this.virtualEncoderValue[this.currentSelection];
                    this.encoderText.text = itemEncoderPosition;


                } else {
                    // we are in adjustment mode
                    
                    
                    // Adjust the selected item
                    
                    encoderPosition = (position + 
                        this.virtualEncoderValue[this.currentSelection] -
                        this.encoderAdjustment);

                    this.callbackFunction[this.currentSelection].callback(
                        true,   // item is selected
                        true,   // item can be adjusted
                        encoderPosition // new position
                    );

                    //TODO: debugging output
                    this.encoderText.text = encoderPosition.toString();
                }

                // Save the last positoin for the next time through
                this.lastPosition = position;
            }
    
        }


    }

    /**
     * Register a callback function.
     * The callback should take two parameters
     *      parameter 1 indicates if the item is selected (true/false)
     *      parameter 2 indicates if the item can be changed (true/false)
     *      parameter 3 is the virtual encoder value
     * 
     * @param {*} callbackFunction 
     */

    registerCallback(callbackClass){
        this.numberOfCallbacksRegistered = this.callbackFunction.push(callbackClass);
        this.virtualEncoderValue[this.numberOfCallbacksRegistered - 1] = 0;

        if (this.numberOfCallbacksRegistered == 1) {
            // This is the first callback registered so select it
            this.callbackFunction[this.currentSelection].callback(
                true,   // item is selected
                true,   // item can be edited
                this.virtualEncoderValue[this.currentSelection]  // 0 to start
                );
        }
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




// ----------------------------------------------------------------------------
// --- VSI Temporary display                                                          ---
// ----------------------------------------------------------------------------

// Constructor

function VSIDisplay(app){

    this.screen_width = app.screen.width;
    this.screen_height = app.screen.height;

    // Create a style to be used for the qnh characters
    this.style = new PIXI.TextStyle({
        fontFamily: 'Tahoma',
        fontSize: '20px',
        fill: "white",
        fontWeight: "normal"
    });

    this.VSIFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 0});
    let text = this.VSIFormat.format(0);

    this.VSIText = new PIXI.Text(text, this.style);
    this.VSIText.anchor.set(0,0);
    this.VSIText.position.set(this.screen_width-5,this.screen_height - 26);

    this.display_box_width = 60;
    this.display_box_height = 26;

    this.VSIRectangle = new PIXI.Graphics();
    this.VSIRectangle.beginFill(0x000000); 
    this.VSIRectangle.lineStyle(2,0xFFFFFF);
    this.VSIRectangle.drawRect(this.screen_width - (this.display_box_width + 1), this.screen_height - (this.display_box_height + 1), this.display_box_width, this.display_box_height);
    this.VSIRectangle.endFill();

    app.stage.addChild(this.VSIRectangle);
    app.stage.addChild(this.VSIText);
}

Object.defineProperties(VSIDisplay.prototype,{
    value: {
        set: function(new_value) {
            this.VSIText.text = this.VSIFormat.format(new_value);
        }
    }
})


// ----------------------------------------------------------------------------
// --- QNH display                                                          ---
// ----------------------------------------------------------------------------

// Constructor

// function QNHDisplay(app, x , y, width, height, radius){

//     this.screen_width = app.screen.width;
//     let arc_radius = radius;

//     // Create a style to be used for the qnh characters
//     this.style = new PIXI.TextStyle({
//         fontFamily: 'Tahoma',
//         fontSize: '18px',
//         fill: "aqua",
//         fontWeight: "normal"
//     });

//     this.QNHFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 2});
//     let text = this.QNHFormat.format(29.92) + " in";

//     this.QNHText = new PIXI.Text(text, this.style);
//     this.QNHText.anchor.set(.5,.5);
//     this.QNHText.position.set(x + width/2 , y - height/2);

//     // Draw Custom Rectangle
//     this.QNHRectangle = new PIXI.Graphics();
//     this.QNHRectangle.beginFill(0x000000, 0.25); 
//     this.QNHRectangle.lineStyle(1,0x00FFFF, 0.5);

//     drawSpecialRectangle(this.QNHRectangle, x, y - height, width, height, arc_radius, false, false, true, true);

//     this.QNHRectangle.endFill();

//     app.stage.addChild(this.QNHRectangle);
//     app.stage.addChild(this.QNHText)

//     function callback(selected, changable, value){
//         // check if the selected parameter has changed
//         if (selected != this.selected) {
//             // We may be selected
//         }
//     }
// }



// Object.defineProperties(QNHDisplay.prototype,{
//     value: {
//         set: function(new_value) {
//             this.QNHText.text = this.QNHFormat.format(Math.floor(new_value)/100) + " in";
//         }
//     }
// })

// ----------------------------------------------------------------------------
// --- TAS display                                                          ---
// ----------------------------------------------------------------------------

// Constructor

function TASDisplay(app, x , y, width, height, radius){

    this.screen_width = app.screen.width;
    let arc_radius = radius;

    // Create a style to be used for the TAS characters
    this.style = new PIXI.TextStyle({
        fontFamily: 'Tahoma',
        fontSize: '18px',
        fill: "chartreuse",
        fontWeight: "normal"
    });

    this.TASFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 0});
    let text = this.TASFormat.format(0) + " TAS";

    this.TASText = new PIXI.Text(text, this.style);
    this.TASText.anchor.set(.5,.5);
    this.TASText.position.set(x + width/2 , y - height/2);

    // Draw Custome Rectangle
    this.TASRectangle = new PIXI.Graphics();
    this.TASRectangle.beginFill(0x000000, 0.25); 
    this.TASRectangle.lineStyle(1,0x7FFF00, 0.5);

    drawSpecialRectangle(this.TASRectangle, x, y - height, width, height, arc_radius, true, true, false, false);

    this.TASRectangle.endFill();

    app.stage.addChild(this.TASRectangle);
    app.stage.addChild(this.TASText)
}

Object.defineProperties(TASDisplay.prototype,{
    value: {
        set: function(new_value) {
            this.TASText.text = this.TASFormat.format(Math.floor(new_value)/100) + " in";
        }
    }
})

// ----------------------------------------------------------------------------
// --- TEMP AirSpeed display                                                ---
// ----------------------------------------------------------------------------

// Constructor

function ASDisplay(app){

    this.screen_width = app.screen.width;
    this.screen_height = app.screen.height;

    // Create a style to be used for the AS characters
    this.style = new PIXI.TextStyle({
        fontFamily: 'Tahoma',
        fontSize: '20px',
        fill: "white",
        fontWeight: "normal"
    });

    this.ASFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 2});
    let text = this.ASFormat.format(29.92);

    //TODO: Move Position of box
    this.ASText = new PIXI.Text(text, this.style);
    this.ASText.anchor.set(0,1);
    this.ASText.position.set(0 + 4,this.screen_height - 4);

    this.display_box_width = 60;
    this.display_box_height = 26;

    this.ASRectangle = new PIXI.Graphics();
    this.ASRectangle.beginFill(0x000000); 
    this.ASRectangle.lineStyle(2,0xFFFFFF);
    //TODO: move positoin of box
    this.ASRectangle.drawRect(1,this.screen_height-(this.display_box_height+1),this.display_box_width,this.display_box_height);
    this.ASRectangle.endFill();

    app.stage.addChild(this.ASRectangle);
    app.stage.addChild(this.ASText);

    this.testfunction = function TestFunction() {
    
    }
}

Object.defineProperties(ASDisplay.prototype,{
    value: {
        set: function(new_value) {
            this.ASText.text = this.ASFormat.format(new_value);
        }
    }
})

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

    this.airspeedHundredsWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 2, false, 1, false, false, x, y);

    let airspeedTensWheelX = x + this.airspeedHundredsWheel.digit_width;
    
    this.airspeedTensWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 1, false, 1, false, false, airspeedTensWheelX, y);

    let airspeedOnesWheelX = airspeedTensWheelX + this.airspeedTensWheel.digit_width;
    this.airspeedOnesWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 0, false, 1, false, false, airspeedOnesWheelX, y);

    let airspeedWidth = this.airspeedOnesWheel.digit_width + this.airspeedTensWheel.digit_width + this.airspeedHundredsWheel.digit_width;

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
    app.stage.addChild(this.airspeedOnesWheel.digit_container);
    app.stage.addChild(this.airspeedTensWheel.digit_container);
    app.stage.addChild(this.airspeedHundredsWheel.digit_container);

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
    this.tensWheel = new NumericWheel("Tahoma", 28, 1489/2048, 30, 1 ,false, 20, true, true, this.x, this.y);

    let hundredsWheelX = this.x - this.tensWheel.digit_width;
    this.hundredsWheel = new NumericWheel("Tahoma", 28, 1489/2048, 30, 2, false, 1, true, true, hundredsWheelX, this.y);

    let thousandsWheelX = hundredsWheelX - this.hundredsWheel.digit_width;
    this.thousandsWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 3, false, 1, true, true, thousandsWheelX, this.y);

    let tenThousandsWheelX = thousandsWheelX - this.thousandsWheel.digit_width;
    this.tenThousandsWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 4, true, 1, true, true, tenThousandsWheelX, this.y);

    let width = this.tensWheel.digit_width + this.hundredsWheel.digit_width + this.thousandsWheel.digit_width + this.tenThousandsWheel.digit_width;
    let width1 = this.tensWheel.digit_width;

    AltitudeWheelOutline(app, this.x, this.y, true, width, 30/2 , width1, (30/2 + 20) );

    this.app.stage.addChild(this.tensWheel.digit_container);
    this.app.stage.addChild(this.hundredsWheel.digit_container);
    this.app.stage.addChild(this.thousandsWheel.digit_container);
    this.app.stage.addChild(this.tenThousandsWheel.digit_container);
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



/** \brief NumbericWheel object displays a rotating wheel style object similar
 *         to an odometer.
*/
// --- NumericWheel object
// --- font_name                    The name of the font to use - string            
// --- font_size                    A number that is the size of the font in pixels
// --- capital_height_ratio         A number that is the height of captial divided by the height of the em square
// --- digit_display_area_height    A number that is the height of the area that is to display the digit in pixels. Generally
// --- digit_position_in_wheel      An integer that indicates the place value for this digit in the numeric wheel display as a power of 10.
// --- display_negative_symbol      A boolean that if true means display the negative symbol
// --- window_height                An integer that is the additional number of pixels to be added both above and below the digit height when displaying the digit
// --- resolution_tens              A boolean that if true means the minimum resolution is Tens and that the ones digit is to be zero (0)
// --- x                            An integer that is the pixel position of the right side of the digit
// --- y                            An integer that is the pixel position of the vertical centre of the digit

// ----------------------------------------------------------------------------
// Constructor

function NumericWheel(font_name, font_size, capital_height_ratio, digit_display_area_height, digit_position_in_wheel, display_negative_symbol, window_height, resolution_tens, align_right, x ,y){
    this.digit_position_in_wheel = digit_position_in_wheel;
    this.display_negative_symbol = display_negative_symbol;
    this.font_name = font_name;             // string 
    this.font_size = String(font_size) + "px";             // string
    this.digit_display_area_height = digit_display_area_height;       // pixels
    this.resolution_tens = resolution_tens; // boolean
    this.window_height = window_height;     // pixels greater than height
    this.digit_capital_height = capital_height_ratio * font_size;   // pixels down to baseline
    this.x = x;                             // pixels
    this.y = y;                             // pixels

    let digits;

    // Create a style to be used for the wheel characters
    this.style = new PIXI.TextStyle({
        fontFamily: this.font_name,
        fontSize: this.font_size,
        fill: "white",
        fontWeight: "bold"
    });

    // Calculate the font ratio (digit_display_area_height/10)
    // This is used to move the digit up and down when scrolling
    this.font_ratio = this.digit_display_area_height / 10;

    // Create sample text to measure using the typical digits to be displayed
    this.sample_message = new PIXI.Text("0123456789", this.style);
    this.sample_metrics = PIXI.TextMetrics.measureText("0123456789", this.style);

    // measure the text
    this.digit_ascent_distance = this.sample_metrics.fontProperties.ascent;
    this.overall_height = this.sample_metrics.height; 

    this.digit_width = Math.ceil(this.sample_message.width / 10);
    if (this.resolution_tens == true && this.digit_position_in_wheel == 1) {
        this.digit_width = this.digit_width * 2;
    }

    // Calculate where the center of the character is vertically
    // as a ratio of the height of the sample message. (value between 0 and 1)
    // This is used for the anchor command.
    this.character_centre = ( this.digit_ascent_distance - (this.digit_capital_height/2)) / (this.overall_height);

    // Create NumericWheelDigit objects for each digit to be displayed
    for (let i=0; i < 10; i++) {
        if (this.resolution_tens && this.digit_position_in_wheel == 1) {
            if (i == 0 ) {
                digits = "00"
            } else {
                digits = String(i * 10);
            }
            this['digit' + String(i)] = new NumericWheelDigit(this.font_name, this.font_size, digits);
        } else {
            this['digit' + String(i)] = new NumericWheelDigit(this.font_name, this.font_size, String(i));
        }
        // set the anchor 
        // TODO: Change the side of the text here by moving the anchor
        // TODO: Changed to 1 from 0
        if (align_right) {
            this['digit' + String(i)].text.anchor.set(1, this.character_centre);
        } else {
            this['digit' + String(i)].text.anchor.set(0, this.character_centre);
        }

    }
    // Create a blank digit
    if (this.resolution_tens && this.digit_position_in_wheel == 1) {
        this['blank'] = new NumericWheelDigit(this.font_name, this.font_size, "  ");
    } else {
        this['blank'] = new NumericWheelDigit(this.font_name, this.font_size, "  ");
    }

    // Create a negative digit
    if (this.display_negative_symbol) {
        this['negative'] = new NumericWheelDigit(this.font_name, this.font_size, "-");
        this['negative'].text.anchor.set(0, this.character_centre);
    }

    this._zero_ok = false;
    if ((resolution_tens && digit_position_in_wheel == 1) || (!resolution_tens && digit_position_in_wheel == 0)) {
        this._zero_ok = true;
    }

    // Create rectangle for mask

    // Create container
    this.digit_container = new PIXI.Container();

    // Create rectangle that will MASK the container
    // The mask co-ordinates are based on parent container (current canvas)
    //   Hence we need to position the mask where we want it to appear in the parent 
    //   Position the mask with the upper left corner at x, y
    
    this.mask_rectangle = new PIXI.Graphics();
    this.mask_rectangle.beginFill(0xFF0000);    // Red Mask

    let mask_rectangle_x;
    if (align_right) {
        mask_rectangle_x = x - this.digit_width;
    } else {
        mask_rectangle_x = x;
    }
    let mask_rectangle_y = y - (this.digit_display_area_height / 2 + this.window_height);

    this.mask_rectangle.drawRect(mask_rectangle_x, mask_rectangle_y,
        this.digit_width, this.digit_display_area_height + (2 * this.window_height));

    this.mask_rectangle.endFill();


    // Position the container in the parent
    this.digit_container.position.set(x,y);
    
    let i;
    for (i = 0; i <= 9; i++) {
        this.digit_container.addChild(this['digit' + String(i)].text);
    }
    if (this.display_negative_symbol) {
        this.digit_container.addChild(this['negative'].text);
    }

    // This will force a call to the set function so all objects need to be created first
    
    this.digit_container.mask = this.mask_rectangle;

    //console.log("constructor");
    this.value = 0;
}

Object.defineProperties(NumericWheel.prototype, {
    value: {
        set: function(value) {
            if (value === undefined) {
                return;
            }


            let negative;

            if (value < 0 ) {
                value = Math.abs(value);
                negative = true
            } else {
                negative = false
            }

            //console.log("value = " + value);

            //console.debug(value);
            // Calculate the smallest base 10 number that is represented when
            //   this digit is non zero. This multiplier is to be used to extract
            //   the digit to be displayed from the value.

            // Smallest non zero number for digit postion to be display
            let _smallest_digit_value = Math.pow(10, this.digit_position_in_wheel);

            //console.debug(_smallest_digit_value);

            // Smallest non zero number for the next digit to the left of the one to
            //   be displayed.
            let _next_digit_value = Math.pow(10, (this.digit_position_in_wheel + 1));

            // Exract the digit that needs to be displayed starting with the reminder when 
            //   dividing by the next digit position and then determining the floor when 
            //   dividing by the current digit position.
            let _digit = Math.floor((value % _next_digit_value) / _smallest_digit_value);

            // ----------------------------------------------------------------
            // --- Determin if we need to hide the zero digit display       ---
            // ----------------------------------------------------------------

            let _hide_zero;

            if ((_digit == 0) && (value < _next_digit_value)) {
                _hide_zero = !this._zero_ok;
            } else {
                _hide_zero = false;
            }

            // ----------------------------------------------------------------
            // --- Calculate the rotation to be applied                     ---
            // ----------------------------------------------------------------

            // The rotation is based on the lowest digit position being displayed 
            //   rotating  betwenn 9 and 0 or 90 and 00

            // Set the rotation to 0 in case there is no rotation required

            let rotation = 0;

            // Check if we are using the 10s or 1s postition to rotate

            if (this.resolution_tens == true) {

                // Rotation based on the 10s (99-00) value
                // This means the ones (1s) value determines the rotation
                
                // Check if we are transitioning through the last 10 nubmers and 
                //   need to rotate
                // if (this.digit_position_in_wheel == 1) {
                //     rotation = value % 10;
                //     console.debug(rotation);
                // } else {
                    if ((value % _smallest_digit_value) > (_smallest_digit_value - 10)) {
                    // The rotation position is based on the 1s position
                        rotation = (value % 10);
                    }
                // }
            } else {
                
                // Rotation based on th 1s (0-9) value
                // This means that the one thenth (0.1s) value determins the rotation

                // Check if we are transitioning through the last 1 (0.1) numbers and
                //   need to rotate

                if ((value % _smallest_digit_value) > (_smallest_digit_value - 1)) {
                    // The rotation position is based on the 0.1s position
                    rotation = ((value % 1) * 10);
                }
            }

            // Display the wheel

            var wheel_digit = [];
            var i;
            for (i = 0; i <= 9 ; i++) {
                wheel_digit[i] = (_digit + (i + 6)) % 10; 
                //console.log(wheel_digit[i]);
            }

            
            for (i = -4 ; i <= 5 ; i++) {
                
                if (_digit == 0 && i == 0 && _hide_zero) {
                    // Display a blank digit by pushing the digit out of the screen???
                    this['digit' + String(wheel_digit[i+4])].text.position.set(0,-this.digit_display_area_height * 6 + rotation * this.font_ratio);
                    if (this.display_negative_symbol) {
                        if (negative) {
                            this['negative'].text.position.set(0,0);
                        } else  {
                            this['negative'].text.position.set(0,-this.digit_display_area_height * 7 + rotation * this.font_ratio)
                        }
                    }
                } else {
                    //console.log(i);
                    //console.log(i+4);
                    //console.log(wheel_digit[i+4]);
                    //console.log(String(wheel_digit[i+4]));
                    this['digit' + String(wheel_digit[i+4])].text.position.set(0,-this.digit_display_area_height * i + rotation * this.font_ratio);
                    //this['negative'].text.position.set(0,-this.digit_display_area_height * 7 + rotation * this.font_ratio)
                }
            }

        }
    }
})


// Create wheel digit text 
// Constructor Function

function NumericWheelDigit(fontName, fontSize, digit) {
    this.fontName = fontName;
    this.fontSize = fontSize;
    this.digit = digit
    this.style = new PIXI.TextStyle({
        fontFamily: this.fontName,
        fontSize: this.fontSize,
        fill: "white",
        fontWeight: "bold"
    });
    this.text = new PIXI.Text(digit, this.style);

}