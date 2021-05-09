// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
let Application = PIXI.Application,
    loader = PIXI.Loader.shared,
    resources = PIXI.Loader.shared.resources,
    TextureCache = PIXI.utils.TextureCache
    Sprite = PIXI.Sprite,
    Rectangle = PIXI.Rectangle;


//Create a Pixi Application
let app = new Application({
    width: 800, 
    height: 480,
    antialias: true,
    transparent: false,
    resolution: 1
    }
);

// Create another application as a test
// This sets up a second canvas for display. This is just a test canvas
let app2 = new Application({
    width: 800,
    height: 128,
    antialias: true,
    transparent: false,
    resolution:1
    }
);

//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);
//document.body.appendChild(app2.view);


let myNumericWheel;
let value = 0;
let adjustment = 1;

var dataObject = new Object();
dataObject._altitude = 0

// 
var XMLHttpRequestObject = false;

// Connect to websocket

var myWebSocket = new WebSocket("ws://localhost:8080/ws");
//console.debug(myWebSocket);

myWebSocket.addEventListener('open', function(event){
    //console.debug(myWebSocket);
    // Let the server no we are ready for data
    myWebSocket.send("ready")
})

//document.fonts.load("bold 28px Tahoma");
//document.fonts.load("28px bold Tahoma");
//document.fonts.load("normal Tahoma")
var tahoma_normal_font = new FontFace('Tahoma', 'url(support/Tahoma.ttf)', {weight: 400});
var tahoma_bold_font = new FontFace('Tahoma', 'url(support/Tahoma%20Bold.ttf)', {weight: 800});

tahoma_normal_font.load().then(function(loaded_face){
    document.fonts.add(loaded_face);
});
tahoma_bold_font.load().then(function(loaded_face){
    document.fonts.add(loaded_face);
})


document.fonts.ready.then(function() {

        setup();
    // When the fonts have loaded run setup

});

// ----------------------------------------------------------------------------
// --- End of Script - We should be event based from this point onward      ---
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// --- Process messages received from the websocket connection              ---
// ----------------------------------------------------------------------------

myWebSocket.onmessage = function (event) {
    dataObject = JSON.parse(event.data);
    console.debug(event.data);
    value = dataObject._altitude;
}

// ----------------------------------------------------------------------------


// This `setup` function will run when the image has loaded
function setup() {

    altitudeWheel = new AltitudeWheel(app, 750, 240)

    app.ticker.add(delta => DisplayUpdateLoop(delta));
}

// Not required for EFIS Display at present
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function DisplayUpdateLoop(delta) {

    altitudeWheel.value = dataObject._altitude


}

// ----------------------------------------------------------------------------
// --- AltitudeWheel object                                                 ---
// ----------------------------------------------------------------------------

function AltitudeWheel(app, x, y){
    this.x = x;
    this.y = y;
    this.app = app;

    tensWheel = new NumericWheel("Tahoma", "28px", 33, 30, 1 ,20, true, this.x, y);
    this.app.stage.addChild(tensWheel.digit_container);
    width1 = tensWheel.digit_width


    hundredsWheel = new NumericWheel("Tahoma", "28px", 33, 30, 2, 1, true, this.x - width1, this.y);
    this.app.stage.addChild(hundredsWheel.digit_container);
    width2 = width1 + hundredsWheel.digit_width


    thousandsWheel = new NumericWheel("Tahoma", "37px", 39, 30, 3, 1, true, this.x - width2, this.y);
    this.app.stage.addChild(thousandsWheel.digit_container);
    width3 = width2 + thousandsWheel.digit_width

    tenThousandsWheel = new NumericWheel("Tahoma", "37px", 39, 30, 4, 1, true, this.x - width3, this.y);
    this.app.stage.addChild(tenThousandsWheel.digit_container);
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

function NumericWheel(font_name, font_size, font_base_line, digit_height, digit_position_in_wheel, window_height, resolution_tens, x ,y){
    this.digit_position_in_wheel = digit_position_in_wheel;
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

    this._zero_ok = false;
    if ((resolution_tens && digit_position_in_wheel == 1) || (!resolution_tens && digit_position_in_wheel == 0)) {
        this._zero_ok = true;
    }

    // Test code for container
    // Create rectangle for mask

    // Create container
    this.digit_container = new PIXI.Container();

    // Create rectangle that will MASK the container
    // The mask co-ordinates are based on parent container (current canvas)
    //   Hence we need to position the mask where we want it to appear in the parent 
    //   Position the mask with the upper left corner at x, y
    this.rectangle = new PIXI.Graphics();
    this.rectangle.beginFill(0x0000000);
    //console.debug(this.digit_width, this.digit_height, this.window_height);
    this.rectangle.drawRect(x - this.digit_width, y - (this.digit_height / 2 + this.window_height) ,this.digit_width, this.digit_height + (2 * this.window_height));
    //console.debug((this.digit_height / 2 + this.window_height));


    this.rectangle.endFill;
    //console.debug(this.rectangle);

    // Create background rectange for inside the container
    this.rectangle1 = new PIXI.Graphics();
    this.rectangle1.beginFill(0x00cccc);
    this.rectangle1.drawRect(0,0 - (this.digit_height / 2 + this.window_height), this.digit_width, this.digit_height + ( 2 * this.window_height));
    this.rectangle1.endFill;

    // Position the background within the container
    //   Was alredy setup above but set it here for fun.
    this.rectangle1.position.set(0,0);

    // Apply the mask to the container
    //this.digit_container.mask = this.rectangle;


    // Put the background rectangle inside the container
    this.digit_container.addChild(this.rectangle1);

    // Position the container in the parent
    this.digit_container.position.set(x - this.digit_width,y);
    
    for (i = 0; i <= 9; i++) {
        this.digit_container.addChild(this['digit' + String(i)].text);
    }


    // This will force a call to the set function so all objects need to be created first
    
    this.digit_container.mask = this.rectangle;

    this.value = 0;
}

Object.defineProperties(NumericWheel.prototype, {
    value: {
        set: function(value) {
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

            // Statically put some digits in the container
            //console.log(_digit);
            for (i = -4 ; i <= 5 ; i++) {
                
                if (_digit == 0 && i == 0 && _hide_zero) {
                    //this["blank"].text.position.set(0,-this.digit_height * i + rotation * this.font_ratio);
                    this['digit' + String(wheel_digit[i+4])].text.position.set(0,-this.digit_height * 10 + rotation * this.font_ratio);
                } else {
                this['digit' + String(wheel_digit[i+4])].text.position.set(0,-this.digit_height * i + rotation * this.font_ratio);
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