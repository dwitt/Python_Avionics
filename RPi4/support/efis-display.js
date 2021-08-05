import { Ribbon } from './ribbon.mjs';
import { AirspeedRibbon } from './airspeedRibbon.mjs';
import { VsiIndicator } from './vsi-indicator.mjs';
import { AttitudeIndicator } from './attitude-indicator.mjs';
import { SlipBallIndicator } from './slipBall.mjs';

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
// ---Create a Pixi Application                                             ---
// ----------------------------------------------------------------------------
let app = new Application({
    width: 800, 
    height: 480,
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
    width: 800,
    height: 128,
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

// ----------------------------------------------------------------------------
// --- Create a new object to hold the data object coming from the websocket---
// ----------------------------------------------------------------------------

//TODO: Not sure if this can be deleted. Need to add a pause and see what happens
var dataObject = new Object();
dataObject._altitude = 0;
dataObject.airspeed = 0;

// ----------------------------------------------------------------------------
// --- Connect to the websocket to recieve the data from the can bus as     ---
// --- objects.                                                             ---
// ----------------------------------------------------------------------------

//console.log(location)
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

var attitudeIndicator,
    altitudeWheel, 
    qnhDisplay, 
    vsiDisplay, 
    altimeter_ribbon, 
    testAirspeedDisplay, 
    airspeedWheel,
    airspeedRibbon,
    vsiIndicator,
    slipBallIndicator;
    
document.fonts.ready.then(function() {
    setup();
});

// ****************************************************************************
// ****************************************************************************
// --- END OF SCRIPT - We should be event based from this point onward      ---
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// --- Process messages received from the websocket connection              ---
// ----------------------------------------------------------------------------

myWebSocket.onmessage = function (event) {
    // parse the event.data into a data object
    // this will contain the data from the CAN buss
    dataObject = JSON.parse(event.data);

}

// ----------------------------------------------------------------------------
// This `setup` function will run when the image has loaded                 ---
// ----------------------------------------------------------------------------
function setup() {

    attitudeIndicator = new AttitudeIndicator(app);            
    altimeter_ribbon = new Ribbon(app, 765, 240, 400, 100, true, 100, 4, 4, true);
    altitudeWheel = new AltitudeWheel(app, 755, 240);
    qnhDisplay = new QNHDisplay(app);
    vsiDisplay = new VSIDisplay(app);
    testAirspeedDisplay = new ASDisplay(app);
 
    airspeedRibbon = new AirspeedRibbon(app, 35, 240, 400, 100, false, 10, 8, 2, false);
    airspeedWheel = new AirspeedWheel(app, 45, 240);

    vsiIndicator = new VsiIndicator(app, 765, 240, 400, 35);

    var aircraft = new AircraftIndicator(app);

    slipBallIndicator = new SlipBallIndicator(app);

    app.ticker.add(delta => DisplayUpdateLoop(delta));
}

// ----------------------------------------------------------------------------
// --- Update called by ticker to update the display                        ---
// ----------------------------------------------------------------------------


function DisplayUpdateLoop(delta) {

    //console.log(dataObject);
    attitudeIndicator.pitch = dataObject.pitch;
    attitudeIndicator.roll = dataObject.roll;
    attitudeIndicator.accy = dataObject.accy;
    altitudeWheel.value = dataObject._altitude;
    qnhDisplay.value = dataObject.qnh;
    altimeter_ribbon.value = dataObject._altitude;
    vsiDisplay.value = dataObject.vsi;
    testAirspeedDisplay.value = dataObject.airspeed;
    airspeedWheel.value = dataObject.airspeed;
    airspeedRibbon.value = dataObject.airspeed;
    vsiIndicator.value = dataObject.vsi;
    slipBallIndicator.acc = dataObject.accy


}

// ----------------------------------------------------------------------------
// --- Aircraft Indicator                                        ---
// ----------------------------------------------------------------------------

function AircraftIndicator(app){

    let displayWidth = app.screen.width;
    let displayHeight = app.screen.height;

    let px1 = displayWidth/6;
    let px2 = displayWidth/20;
    let px3 = displayWidth/30;
    let px4 = displayWidth/40;

    let py1 = displayHeight/8;
    let py2 = displayHeight/30;

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
    aircraftGraphics.moveTo(-px1 + px2 , 0);
    aircraftGraphics.lineTo(-px1 , 0);
    // 90 on left
    aircraftGraphics.moveTo(-2 * px4 , 0);
    aircraftGraphics.lineTo(-1.5 * px4, 0);
    aircraftGraphics.lineTo(-1.5 * px4, py2);

    // large horizontal on right
    aircraftGraphics.moveTo(px1, 0);
    aircraftGraphics.lineTo(px1 - px2, 0);
    // 90 on right
    aircraftGraphics.moveTo(2 * px4 , 0);
    aircraftGraphics.lineTo(1.5 * px4, 0);
    aircraftGraphics.lineTo(1.5 * px4, py2);


    // draw yellow foreground
    lineOptions.width = 6;
    lineOptions.color = 0xFFFF00;

    aircraftGraphics.lineStyle(lineOptions);

    aircraftGraphics.moveTo(-px1 + px2, 0);
    aircraftGraphics.lineTo(-px1, 0);

    aircraftGraphics.moveTo(-2 * px4 , 0);
    aircraftGraphics.lineTo(-1.5 * px4, 0);
    aircraftGraphics.lineTo(-1.5 * px4, py2);

    aircraftGraphics.moveTo(px1 , 0);
    aircraftGraphics.lineTo(px1 - px2, 0);

    aircraftGraphics.moveTo(2 * px4 , 0);
    aircraftGraphics.lineTo(1.5 * px4, 0);
    aircraftGraphics.lineTo(1.5 * px4, py2);

    // draw yellow Dot
    lineOptions.width = 1;
    lineOptions.color = 0x000000;
    lineOptions.alignment = 1;

    aircraftGraphics.lineStyle(lineOptions);

    aircraftGraphics.beginFill(0xFFFF00,1);
    aircraftGraphics.drawCircle(0,0,6);

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
    this.VSIText.anchor.set(1,0);
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

function QNHDisplay(app){

    this.screen_width = app.screen.width;

    // Create a style to be used for the qnh characters
    this.style = new PIXI.TextStyle({
        fontFamily: 'Tahoma',
        fontSize: '20px',
        fill: "white",
        fontWeight: "normal"
    });

    this.QNHFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 2});
    let text = this.QNHFormat.format(29.92);

    this.QNHText = new PIXI.Text(text, this.style);
    this.QNHText.anchor.set(1,0);
    this.QNHText.position.set(this.screen_width-5,0);

    this.display_box_width = 60;
    this.display_box_height = 26;

    this.QNHRectangle = new PIXI.Graphics();
    this.QNHRectangle.beginFill(0x000000); 
    this.QNHRectangle.lineStyle(2,0xFFFFFF);
    this.QNHRectangle.drawRect(this.screen_width - (this.display_box_width + 1),0,this.display_box_width,this.display_box_height);
    this.QNHRectangle.endFill();

    app.stage.addChild(this.QNHRectangle);
    app.stage.addChild(this.QNHText)
}

Object.defineProperties(QNHDisplay.prototype,{
    value: {
        set: function(new_value) {
            this.QNHText.text = this.QNHFormat.format(Math.floor(new_value)/100);
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

function AirspeedWheel(app, x ,y){

    // Create wheel elements for the digits in the airspeed

    this.airspeedHundredsWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 2, false, 1, false, false, x, y);

    let airspeedTensWheelX = x + this.airspeedHundredsWheel.digit_width;
    
    this.airspeedTensWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 1, false, 1, false, false, airspeedTensWheelX, y);

    let airspeedOnesWheelX = airspeedTensWheelX + this.airspeedTensWheel.digit_width;
    this.airspeedOnesWheel = new NumericWheel("Tahoma", 37, 1489/2048, 30, 0, false, 1, false, false, airspeedOnesWheelX, y);

    let airspeedWidth = this.airspeedOnesWheel.digit_width + this.airspeedTensWheel.digit_width + this.airspeedHundredsWheel.digit_width;

    airspeedWheelOutline(app, x ,y , airspeedWidth, 15);

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

function AltitudeWheel(app, x, y){
    this.x = x;
    this.y = y;
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

    AltitudeWheelOutline(app,x,y, true, width, 30/2 , width1, (30/2 + 20) );

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
// --- capital_height_ratio         A number that is the height of captial divided by the the em square
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