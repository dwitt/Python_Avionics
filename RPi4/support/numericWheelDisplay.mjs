/*global PIXI */
'use strict';
import { calculateCharacterVerticalCentre } from "./utilityFunctions.mjs";


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
    Text = PIXI.Text;



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


export class NumericWheelDisplay{

    constructor(font_name, font_size, capital_height_ratio, digit_display_area_height, digit_position_in_wheel, display_negative_symbol, window_height, resolution_tens, align_right, x ,y){
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
        // this.font_ratio = this.digit_display_area_height / 10;

        // // Create sample text to measure using the typical digits to be displayed
        // this.sample_message = new PIXI.Text("0123456789", this.style);


        // this.sample_metrics = PIXI.TextMetrics.measureText("0123456789", this.style);

        // // measure the text
        // this.digit_ascent_distance = this.sample_metrics.fontProperties.ascent;
        // this.overall_height = this.sample_metrics.height; 

        // // Calculate where the center of the character is vertically
        // // as a ratio of the height of the sample message. (value between 0 and 1)
        // // This is used for the anchor command.
        // this.character_centre = ( this.digit_ascent_distance - (this.digit_capital_height/2)) / (this.overall_height);

        this.character_centre = calculateCharacterVerticalCentre(font_name, this.font_size, "bold", capital_height_ratio, "0123456789" );

        this.digit_width = Math.ceil(this.sample_message.width / 10);
        if (this.resolution_tens == true && this.digit_position_in_wheel == 1) {
            this.digit_width = this.digit_width * 2;
        }

       

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


    set value (value) {
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
// Create wheel digit text 
// Constructor Function

export class NumericWheelDigit {
    
    constructor(fontName, fontSize, digit) {
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
}