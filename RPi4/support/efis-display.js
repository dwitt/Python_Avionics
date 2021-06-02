// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
let Application = PIXI.Application,
    loader = PIXI.Loader.shared,
    resources = PIXI.Loader.shared.resources,
    TextureCache = PIXI.utils.TextureCache
    Sprite = PIXI.Sprite,
    Rectangle = PIXI.Rectangle,
    Graphics = PIXI.Graphics,
    Container = PIXI.Container,
    Text = PIXI.Text;

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
//var dataObject = new Object();
//dataObject._altitude = 0;

// ----------------------------------------------------------------------------
// --- Connect to the websocket to recieve the data from the can bus as     ---
// --- objects.                                                             ---
// ----------------------------------------------------------------------------

var myWebSocket = new WebSocket("ws://localhost:8080/ws");

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

document.fonts.ready.then(function() {
    setup();
});

// ----------------------------------------------------------------------------
// --- End of Script - We should be event based from this point onward      ---
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

    background = new BackgroundDisplay(app);            
    bank_arc = new Bank_Arc(app);
    altimeter_ribbon = new Ribbon(app);
    altitudeWheel = new AltitudeWheel(app, 750, 240);
    qnhDisplay = new QNHDisplay(app);

    //app.stage.addChild(qnhDisplay.QNHText);
    //app.stage.addChild(qnhDisplay.QNHRectangle);

    app.ticker.add(delta => DisplayUpdateLoop(delta));
}

// ----------------------------------------------------------------------------
// --- Update called by ticker to update the display                        ---
// ----------------------------------------------------------------------------


function DisplayUpdateLoop(delta) {

    altitudeWheel.value = dataObject._altitude;
    qnhDisplay.value = dataObject.qnh;
    altimeter_ribbon.value = dataObject._altitude;


}

// ----------------------------------------------------------------------------
// --- Temporary background display                                         ---
// ----------------------------------------------------------------------------

function BackgroundDisplay(app){

    // get the dimensions of the app rectangle
    this.display_width = app.screen.width;
    this.display_height = app.screen.height;

    // Create a container so that we can hold two different color rectangles

    this.background_container = new Container();

    // Create the sky rectangle
    this.sky_rectangle = new Graphics();
    this.sky_rectangle.beginFill(0x000088);
    this.sky_rectangle.drawRect(0,0,799,239);
    this.sky_rectangle.endFill();

    this.ground_rectangle = new Graphics();
    this.ground_rectangle.beginFill(0x884400);
    this.ground_rectangle.drawRect(0,240,799,479);
    this.ground_rectangle.endFill();

    this.background_container.addChild(this.sky_rectangle);
    this.background_container.addChild(this.ground_rectangle);

    app.stage.addChild(this.background_container);

}

// ----------------------------------------------------------------------------
// --- Altimeter Ribbon                                                     ---
// ----------------------------------------------------------------------------

// Constructor

function Ribbon(app, height, width, right) {

    // --- set Parameters -----------------------------------------------------

    this.ribbon_height = 400;           // height in pixels
    this.ribbon_width = 100;            // width in pixels
    this.ribbon_position_right = true;  // position the ribbon relative to it's right edge

    this.ribbon_interval_power = 2;     // Scaling is not working
    this.ribbon_interval = Math.pow(10, this.ribbon_interval_power);
    this.ribbon_minor_intervals = 4;

    // --- create a container to hold the entire ribbon including text --------
    this.ribbon_container = new Container();

    // --- create the semi-transparent background -----------------------------
    this.ribbon_background = new Graphics();

    this.ribbon_background.beginFill(0x000000, 0.15);  // black, 25%
    if (this.ribbon_position_right) {
        ribbon_position = -1;
    } else {
        ribbon_position = 1;
    }
    this.ribbon_background.drawRect(0, 0 ,ribbon_position * this.ribbon_width, this.ribbon_height);
    this.ribbon_background.endFill();

    // --- create the ruler tick marks ----------------------------------------
    this.ruler = new Graphics()
    this.ruler.lineStyle(2,0xFFFFFF);
    if (this.ribbon_position_right) {
        multiplier = -1;
    } else {
        multiplier = 1;
    }
    for(i = -this.ribbon_interval; i <= (5 * this.ribbon_interval); i = i + this.ribbon_interval/this.ribbon_minor_intervals){
        this.ruler.moveTo(0,i);
        if ((i % 100) == 0) {
            this.ruler.lineTo(multiplier * 20,i);
        } else {
            this.ruler.lineTo(multiplier * 10,i);
        }
    }

    // --- create the ribbon mask ---------------------------------------------
    // Masks must be positioned absolutely
    this.ribbon_mask = new Graphics();
    this.ribbon_mask.beginFill(0xFF0000);
    this.ribbon_mask.drawRect(660,40,100,400);
    this.ribbon_mask.endFill();

    // --- set the position of the container ----------------------------------

    this.ribbon_container.position.set(760, 40);


    this.ribbon_container.addChild(this.ribbon_background);
    this.ribbon_container.addChild(this.ruler);

    this.ribbon_container.mask = this.ribbon_mask;

    app.stage.addChild(this.ribbon_container);

    // --- create the text elements for the ribbon ----------------------------

    text_style = new PIXI.TextStyle({
        fontFamily: "Tahoma",
        fontSize: 22,
        fill: "white",
        fontWeight: "normal"
        
    });

    this.text_stack = [];
    // Create 5 text objects 
    for (i = 0; i < 5; i = i + 1) {
        this.text_stack[i] = new Text(String(i*100), text_style);
        this.text_stack[i].anchor.set(1,.5);
        this.text_stack[i].position.set(-30, 200 - i*100);
        this.ribbon_container.addChild(this.text_stack[i]);
    }


    this._value = 0;
    this.value = 0;

}

// Value setter for Altimeter_Ribbon Object

Object.defineProperties(Ribbon.prototype, {
    value: { 
        set: function(new_value) {

            if (new_value == this._value) {
                return;
            }

            this._value = new_value;
            interval = Math.pow(10, this.ribbon_interval_power);

            // if the numbers in 100 are evenly spaced we should have
            //   no more than 5 displayed at any one time

            if (new_value >= 0 ) {
                value_interval = (Math.floor(new_value / interval) * interval) ;
            } else {
                value_interval = (Math.ceil(new_value / interval) * interval) ;
            }
            remainder = new_value % interval;

            this.ruler.position.set(0, remainder);

            for (i = 0; i < 5; i = i + 1) {
                // show values based on the remainder
                // This is not fully scalable
                if (remainder < interval / 2) {
                    // extra digits to the bottom
                    this.text_stack[i].position.set(-30,this.ribbon_height - ((i * interval) - remainder));
                    this.text_stack[i].text = String(i * interval + value_interval - (this.ribbon_height / 2));
                } else {
                    // extra digits to the top
                    this.text_stack[i].position.set(-30,(this.ribbon_height - interval) - ((i * interval) - remainder));
                    this.text_stack[i].text = String(i * interval + value_interval - (this.ribbon_height / 2 - interval));
                }
                 
            }



        }
    }
})

// ----------------------------------------------------------------------------
// --- Bank Angle Arc                                                       ---
// ----------------------------------------------------------------------------

function Bank_Arc(app) {

    // Parameters
    this.radius = 180;
    this.start_radians = 7 / 6 * Math.PI;   // 210 deg
    this.end_radians = 11 / 6 * Math.PI;    // 330 deg
    this.major_length = 20;
    this.minor_length = 15;

    // Tic mark locations measured in PI radians
    this.major_marks = [7/6, 8/6, 10/6, 11/6];  
    this.minor_marks = [5/4, 25/18, 26/18, 28/18, 29/18, 7/4];  

    // get the dimensions of the app rectangle
    this.display_width = app.screen.width;
    this.display_height = app.screen.height;

    this.centre_x = this.display_width / 2;
    this.centre_y = this.display_height / 2

    // Create the container to hold the arc
    this.arc_container = new Container();

    // Create the arc
    this.arc = new Graphics();
    
    // Draw the arc shape with a semi transparent background
    this.arc.beginFill(0x880088, 0.5);  // background fill
    this.arc.lineStyle(1,0x000088);     // Outline (set to background colour)
    this.arc.arc(this.centre_x, this.centre_y,this.radius, this.start_radians, this.end_radians,false);
    x = (this.radius + this.major_length) * Math.cos((2 * Math.PI) - this.end_radians) + this.centre_x;
    y = -(this.radius + this.major_length) * Math.sin((2 * Math.PI) - this.end_radians) + this.centre_y;
    this.arc.lineTo(x,y);
    this.arc.arc(this.centre_x, this.centre_y,this.radius + this.major_length, this.end_radians, this.start_radians,true);
    x = (this.radius) * Math.cos((2 * Math.PI) - this.start_radians) + this.centre_x;
    y = -(this.radius) * Math.sin((2 * Math.PI) - this.start_radians) + this.centre_y;
    this.arc.lineTo(x,y);
    this.arc.endFill();

    // Draw the are line
    this.arc.lineStyle(1,0xFFFFFF);
    this.arc.arc(this.centre_x, this.centre_y,this.radius, this.start_radians, this.end_radians,false);

    // Draw the markings
    
    this.arc.lineStyle(1,0xFFFFFF);
    for (let i = 0; i < this.major_marks.length; i = i + 1) {
        angle = 2 * Math.PI - this.major_marks[i] * Math.PI; 
        unit_x = Math.cos(angle);
        unit_y = Math.sin(angle);

        x = this.radius * unit_x + this.centre_x;
        y = -this.radius * unit_y + this.centre_y;
        x1 = (this.radius + this.major_length) * unit_x + this.centre_x;
        y1 = -(this.radius + this.major_length) * unit_y + this.centre_y;

        this.arc.moveTo(x,y);
        this.arc.lineTo(x1,y1);
    }

    for (let i = 0; i < this.minor_marks.length; i = i + 1) {
        angle = 2 * Math.PI - this.minor_marks[i] * Math.PI; 
        unit_x = Math.cos(angle);
        unit_y = Math.sin(angle);

        x = this.radius * unit_x + this.centre_x;
        y = -this.radius * unit_y + this.centre_y;
        x1 = (this.radius + this.minor_length) * unit_x + this.centre_x;
        y1 = -(this.radius + this.minor_length) * unit_y + this.centre_y;

        this.arc.moveTo(x,y);
        this.arc.lineTo(x1,y1);
    }

    // Save the are in the container and display it
    this.arc_container.addChild(this.arc);
    app.stage.addChild(this.arc_container);

}



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
    text = this.QNHFormat.format(29.92);

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
// --- AltitudeWheel object                                                 ---
// ----------------------------------------------------------------------------

function AltitudeWheel(app, x, y){
    this.x = x;
    this.y = y;
    this.app = app;


    tensWheel = new NumericWheel("Tahoma", "28px", 33, 30, 1 ,false, 20, true, this.x, y);
    //this.app.stage.addChild(tensWheel.digit_container);
    width1 = tensWheel.digit_width


    hundredsWheel = new NumericWheel("Tahoma", "28px", 33, 30, 2, false, 1, true, this.x - width1, this.y);
    //this.app.stage.addChild(hundredsWheel.digit_container);
    width2 = width1 + hundredsWheel.digit_width


    thousandsWheel = new NumericWheel("Tahoma", "37px", 39, 30, 3, false, 1, true, this.x - width2, this.y);
    //this.app.stage.addChild(thousandsWheel.digit_container);
    width3 = width2 + thousandsWheel.digit_width

    tenThousandsWheel = new NumericWheel("Tahoma", "37px", 39, 30, 4, true, 1, true, this.x - width3, this.y);
    //this.app.stage.addChild(tenThousandsWheel.digit_container);
    width = width3 + tenThousandsWheel.digit_width



    AltitudeWheelOutline(app,x,y, true, width, 30/2 , width1, (30/2 + 20) );

    this.app.stage.addChild(tensWheel.digit_container);
    this.app.stage.addChild(hundredsWheel.digit_container);
    this.app.stage.addChild(thousandsWheel.digit_container);
    this.app.stage.addChild(tenThousandsWheel.digit_container);
}

function AltitudeWheelOutline(app,x,y,right,width,height,left_width,left_height){
    let line = new Graphics();
    line.lineStyle(2,0xFFFFFF);
    line.beginFill(0x000000);
    line.moveTo(x+6,y);
    line.lineTo(x+1,y-5);
    line.lineTo(x+1,y-(1+left_height));
    line.lineTo(x-(1+left_width),y-(1+left_height));
    line.lineTo(x-(1+left_width),y-(1+height));
    line.lineTo(x-(1+width),y-(1+height));
    line.lineTo(x-(1+width),y+(2+height));
    line.lineTo(x-(1+left_width),y+(2+height));
    line.lineTo(x-(1+left_width),y+(1+left_height));
    line.lineTo(x+1,y+(1+left_height));
    line.lineTo(x+1,y+5);
    line.lineTo(x+6,y);
    line.endFill();

    app.stage.addChild(line);

}

Object.defineProperties( AltitudeWheel.prototype, {
    value: { 
        set: function(value) {
            tensWheel.value = value;
            hundredsWheel.value = value;
            thousandsWheel.value = value;
            tenThousandsWheel.value = value;
        }
    }
})

// ----------------------------------------------------------------------------
// --- NumericWheel object                                                  ---
// ----------------------------------------------------------------------------
// Constructor

function NumericWheel(font_name, font_size, font_base_line, digit_height, digit_position_in_wheel, display_negative_symbol, window_height, resolution_tens, x ,y){
    this.digit_position_in_wheel = digit_position_in_wheel;
    this.display_negative_symbol = display_negative_symbol;
    this.font_name = font_name;             // text 
    this.font_size = font_size;             // pixels
    this.digit_height = digit_height;       // pixels
    this.resolution_tens = resolution_tens; // boolean
    this.window_height = window_height;     // pixels greater than height
    this.font_base_line = font_base_line;   // pixels down to baseline
    this.x = x;                             // pixels
    this.y = y;                             // pixels
    //this.value = 0;

    // Create a style to be used for the wheel characters
    this.style = new PIXI.TextStyle({
        fontFamily: this.font_name,
        fontSize: this.font_size,
        fill: "white",
        fontWeight: "bold"
    });

    // Calculate the font ratio (digit_height/10)
    this.font_ratio = this.digit_height / 10;

    // Create sample text to measure
    this.sample_message = new PIXI.Text("0123456789", this.style);
    this.sample_metrics = PIXI.TextMetrics.measureText("0123456789", this.style);

    // measure the text -- SOME VALUES NOT USED
    this.lineHeight = this.sample_metrics.lineHeight;
    this.leading = this.sample_metrics.leading;
    this.ascent = this.sample_metrics.fontProperties.ascent;
    this.descent = this.sample_metrics.fontProperties.descent;
    
    // measured values being used
    this.message_height = this.sample_metrics.height;                   // currently used
    this.digit_width = Math.ceil(this.sample_message.width / 10);
    if (this.resolution_tens == true && this.digit_position_in_wheel == 1) {
        this.digit_width = this.digit_width * 2;
    }

    // Calculate where the center of the character is vertically
    this.character_centre = ( this.font_base_line - ( this.digit_height / 2)) / this.message_height;

    // Create NumericWheelDigit objects for each digit to be displayed
    for (let i=0; i < 10; i++) {
        if (this.resolution_tens && this.digit_position_in_wheel == 1) {
            if (i == 0 ) {
                digits = "00"
            } else {
                digits = String(i * 10);
            }
            this['digit' + String(i)] = new NumericWheelDigit(this.digit_height, this.font_name, this.font_size, digits);
        } else {
            this['digit' + String(i)] = new NumericWheelDigit(this.digit_height, this.font_name, this.font_size, String(i));
        }
        // set the anchor
        this['digit' + String(i)].text.anchor.set(0, this.character_centre);

    }
    // Create a blank digit
    if (this.resolution_tens && this.digit_position_in_wheel == 1) {
        this['blank'] = new NumericWheelDigit(this.digit_height, this.font_name, this.font_size, "  ");
    } else {
        this['blank'] = new NumericWheelDigit(this.digit_height, this.font_name, this.font_size, "  ");
    }

    // Create a negative digit
    if (this.display_negative_symbol) {
        this['negative'] = new NumericWheelDigit(this.digit_height, this.font_name, this.font_size, "-");
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
    //console.debug(this.digit_width, this.digit_height, this.window_height);
    this.mask_rectangle.drawRect(x - this.digit_width, y - (this.digit_height / 2 + this.window_height) ,this.digit_width, this.digit_height + (2 * this.window_height));
    //console.debug((this.digit_height / 2 + this.window_height));


    this.mask_rectangle.endFill();
    //console.debug(this.rectangle);

    // Position the container in the parent
    this.digit_container.position.set(x - this.digit_width,y);
    
    for (i = 0; i <= 9; i++) {
        this.digit_container.addChild(this['digit' + String(i)].text);
    }
    if (this.display_negative_symbol) {
        this.digit_container.addChild(this['negative'].text);
    }

    // This will force a call to the set function so all objects need to be created first
    
    this.digit_container.mask = this.mask_rectangle;

    this.value = 0;
}

Object.defineProperties(NumericWheel.prototype, {
    value: {
        set: function(value) {
            if (value < 0 ) {
                value = Math.abs(value);
                negative = true
            } else {
                negative = false
            }


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

            let wheel_digit = [];
            for (i = 0; i <= 9 ; i++) {
                wheel_digit[i] = (_digit + (i + 6)) % 10 
            }

            
            for (i = -4 ; i <= 5 ; i++) {
                
                if (_digit == 0 && i == 0 && _hide_zero) {
                    // Display a blank digit by pushing the digit out of the screen???
                    this['digit' + String(wheel_digit[i+4])].text.position.set(0,-this.digit_height * 6 + rotation * this.font_ratio);
                    if (this.display_negative_symbol) {
                        if (negative) {
                            this['negative'].text.position.set(0,0);
                        } else  {
                            this['negative'].text.position.set(0,-this.digit_height * 7 + rotation * this.font_ratio)
                        }
                    }
                } else {
                    this['digit' + String(wheel_digit[i+4])].text.position.set(0,-this.digit_height * i + rotation * this.font_ratio);
                    //this['negative'].text.position.set(0,-this.digit_height * 7 + rotation * this.font_ratio)
                }
            }

        }
    }
})


// Create wheel digit text 
// Constructor Function

function NumericWheelDigit(digitHeight, fontName, fontSize, digit) {
    this.digitHeight = digitHeight
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