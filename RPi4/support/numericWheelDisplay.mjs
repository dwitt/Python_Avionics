/*global PIXI */
'use strict';
import { calculateCharacterVerticalCentre } from "./utilityFunctions.mjs";


// Aliases - Allows for changes in PIXI.JScapital_height
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

export class NumericWheelDisplay{
    /**
     * 
     * @param {string} fontName The name of the font family.
     * @param {number} fontSize The size of the font in pixels.
     * @param {number} capitalHeightRatio The ration of the hight of a capital divided by the em square
     * @param {number} digitDisplayAreaHeight The height in pixels of the display area
     * @param {number} digitPositionInWheel 
     * @param {boolean} displayNegativeSymbol Display negative symbol if true
     * @param {number} windowHeight The number of pixels to expand the display both above and below.
     * @param {boolean} resolutionTens If true display the first digit in tens instead of ones.
     * @param {boolean} alignRight If true the display is right aligned.
     * @param {number} x The x position wheel taking into account the alignment.
     * @param {number} y The y position of the center of the wheel vertically.
     */
    constructor(fontName, fontSize, capitalHeightRatio, digitDisplayAreaHeight, digitPositionInWheel, displayNegativeSymbol, windowHeight, resolutionTens, alignRight, x ,y){
        
        let digits, i ,fontSizePxString, additionalWindowHeight, maskRectangle;
        
        this._digitPositionInWheel = digitPositionInWheel;
        this._displayNegativeSymbol = displayNegativeSymbol;
        this._digitDisplayAreaHeight = digitDisplayAreaHeight;       // pixels
        this._resolutionTens = resolutionTens; // boolean
        
        additionalWindowHeight = windowHeight;     // pixels greater than height
        fontSizePxString = String(fontSize) + "px";             // string

        /** Set an internal flag that indicates if this particular wheel should
         *  show a zero digit when the value is set to zero. This hides leading
         *  zeros in the wheel. The flag is set if this is the first digit on 
         *  the right of the display. It could be either the 1s or the 10s position
         *  if we are not displaying 1s
         */
        this._zeroOk = false;
        if ((this._resolutionTens && this._digitPositionInWheel == 1) || 
            (!this._resolutionTens && this._digitPositionInWheel == 0)) {
            this._zeroOk = true;
        }

        /** Create a style to be used for the wheel characters */
        let style = new PIXI.TextStyle({
            fontFamily: fontName,
            fontSize: fontSizePxString,
            fill: "white",
            fontWeight: "bold"
        });

        /**********************************************************************
         * Calculate all of the font metrics and dimensions needed to position
         * the characters in the wheel display.
         **********************************************************************/

        /** Calculate the font ratio (digitDisplayAreaHeight/10)
         * This is used to move the digit up and down when scrolling
         */ 
        this._fontRatio = this._digitDisplayAreaHeight / 10;

        /** Create sample text to measure using the typical digits to be displayed */
        let sampleMessage = new Text("0123456789", style);

        this.digitWidth = Math.ceil(sampleMessage.width / 10);
        if (this._resolutionTens == true && this._digitPositionInWheel == 1) {
            this.digitWidth = this.digitWidth * 2;
        }

        /** Calculate the verticl center of the character as an anchor point */
        let characterVerticalCentre = calculateCharacterVerticalCentre(fontName, fontSize, "bold", capitalHeightRatio, "0123456789" );

        /**********************************************************************
         * Create all of the PixiJS objects needed for the display      
         **********************************************************************/

        /** Create a container to hold all of the objects. The objects will be 
         *  positioned based on the origin of the ocntainer
         */
        this.digitContainer = new Container();

        /** Position the container in the parent */
        this.digitContainer.position.set(x,y);

        /** Create all of the Text digits to be displayed in the wheel */

        /** Create NumericWheelDigit objects for each digit to be displayed */
        for (let i=0; i < 10; i++) {
            if (this._resolutionTens && this._digitPositionInWheel == 1) {
                if (i == 0 ) {
                    digits = "00"
                } else {
                    digits = String(i * 10);
                }
                this['digit' + String(i)] = new NumericWheelDigit(fontName, fontSizePxString, digits);
            } else {
                this['digit' + String(i)] = new NumericWheelDigit(fontName, fontSizePxString, String(i));
            }
            /** Set the anchor to align the character left or right and at the
             *  vertical centre
             */
            if (alignRight) {
                this['digit' + String(i)].text.anchor.set(1, characterVerticalCentre);
            } else {
                this['digit' + String(i)].text.anchor.set(0, characterVerticalCentre);
            }

        }

        // TODO: Consider removing the following. Check if we actually use the 
        //       blank. I think we just push the characters out of the masked
        //       area instead.

        /** Create a blank digit */
        if (this._resolutionTens && this._digitPositionInWheel == 1) {
            this['blank'] = new NumericWheelDigit(fontName, fontSizePxString, "  ");
        } else {
            this['blank'] = new NumericWheelDigit(fontName, fontSizePxString, " ");
        }

        /** Create a negative sign digit */
        if (this._displayNegativeSymbol) {
            this['negative'] = new NumericWheelDigit(fontName, fontSizePxString, "-");
            this['negative'].text.anchor.set(0, characterVerticalCentre);
        }

        /** Create rectangle that will MASK the container
         *  The mask co-ordinates are based on parent container (current canvas),
         *  hence we need to draw and position the mask where we want it to appear in the parent.
         *  Position the mask centred vertically at y and with x at either the
         *  right of left side depending on the alignment of the digits
         */
        maskRectangle = new Graphics();
        maskRectangle.beginFill(0xFF0000);    // Red Mask

        let maskRectangleX;

        if (alignRight) {
            maskRectangleX = x - this.digitWidth;
        } else {
            maskRectangleX = x;
        }
        let maskRectangleY = y - (this._digitDisplayAreaHeight / 2 + additionalWindowHeight);

        maskRectangle.drawRect(maskRectangleX, maskRectangleY, this.digitWidth, this._digitDisplayAreaHeight + (2 * additionalWindowHeight));

        maskRectangle.endFill();

        /** Add all of the PixiJS objects to the container */

        for (i = 0; i <= 9; i++) {
            this.digitContainer.addChild(this['digit' + String(i)].text);
        }
        if (this._displayNegativeSymbol) {
            this.digitContainer.addChild(this['negative'].text);
        }

        this.digitContainer.mask = maskRectangle;

        /** Set the value of this wheel to zero which will then call the setter */
        this.value = 0;
    }

    /** Set the value of the digit by passing the value of the entire wheel to
     *  be displayed. The value for the individual digit will be determined and
     *  if the wheel is rotatating more than just the smallest digits each 
     *  larger digit will be rotated accordingly
     */
    set value (newValue) {
        if (newValue === undefined) {
            return;
        }

        let negative;

        if (newValue < 0 ) {
            newValue = Math.abs(newValue);
            negative = true
        } else {
            negative = false
        }

        /** Calculate the smallest base 10 number that is represented when
         *  this digit is non zero. This multiplier is to be used to extract
         *   the digit to be displayed from the value.
         */

        /** Smallest non zero number for digit postion to be display */
        let smallestDigitValue = Math.pow(10, this._digitPositionInWheel);

        /** Smallest non zero number for the next digit to the left of the one to
         *   be displayed.
         */ 
        let nextDigitValue = Math.pow(10, (this._digitPositionInWheel + 1));

        /** Exract the digit that needs to be displayed starting with the reminder when 
         * dividing by the next digit position and then determining the floor when 
         *  dividing by the current digit position.
         */
        let digit = Math.floor((newValue % nextDigitValue) / smallestDigitValue);

        /** Determine if we need to hide the zero digit. This will happen if 
         *  this digit position has no number to be displayed.
         */
        let hideZero;

        if ((digit == 0) && (newValue < nextDigitValue)) {
            hideZero = !this._zeroOk;
        } else {
            hideZero = false;
        }

        /** Calculate the rotation to be applied */

        /** The rotation is based on the lowest digit position being displayed 
         *  rotating  betwenn 9 and 0 or 90 and 00 when increasing or the
         *  reverse when decreasing
         *
         * Set the rotation to 0 in case there is no rotation required
         */
        let rotation = 0;

        /** Check if we are using the 10s or 1s postition to rotate */

        if (this._resolutionTens == true) {

            /** Rotation based on the 10s (99-00) value
             *  This means the ones (1s) value determines the rotation
             *
             *  Check if we are transitioning through the last 10 nubmers and 
             *  need to rotate
             */
            if ((newValue % smallestDigitValue) > (smallestDigitValue - 10)) {
                /** The rotation position is based on the 1s position */
                rotation = (newValue % 10);
                }

        } else {
            
            /** Rotation based on the 1s (0-9) value
             * This means that the one thenth (0.1s) value determines the rotation
             *
             * Check if we are transitioning through the last 1 (0.1) numbers and
             *   need to rotate
             */
            if ((newValue % smallestDigitValue) > (smallestDigitValue - 1)) {
                /** The rotation position is based on the 0.1s position */
                rotation = ((newValue % 1) * 10);
            }
        }

        /** Display the wheel
         *  Arrange the digits in the correct order
         *  Fill an array (wheeldigit) with the digits arrange as an unwound
         *  wheel with the 5th (index of 4) position being the digit to be 
         *  displayed
         */
        var wheelDigit = [];
        var i;
        for (i = 0; i <= 9 ; i++) {
            wheelDigit[i] = (digit + (i + 6)) % 10; 
        }

        for (i = -4 ; i <= 5 ; i++) {
            if (digit == 0 && i == 0 && hideZero) {
                /**  Display a blank digit by pushing the digit out of the screen??? */
                this['digit' + String(wheelDigit[i+4])].text.position.set(0,-this._digitDisplayAreaHeight * 6 + rotation * this._fontRatio);
                if (this._displayNegativeSymbol) {
                    if (negative) {
                        this['negative'].text.position.set(0,0);
                    } else  {
                        this['negative'].text.position.set(0,-this._digitDisplayAreaHeight * 7 + rotation * this._fontRatio)
                    }
                }
            } else {

                this['digit' + String(wheelDigit[i+4])].text.position.set(0,-this._digitDisplayAreaHeight * i + rotation * this._fontRatio);

            }
        }

    }

}
/** Create wheel digit text */
export class NumericWheelDigit {
    
    constructor(fontName, fontSize, digit, colour = "white") {
        let style = new PIXI.TextStyle({
            fontFamily: fontName,
            fontSize: fontSize,
            fill: colour,
            fontWeight: "bold"
        });
        this.text = new PIXI.Text(digit, style);
    }
}