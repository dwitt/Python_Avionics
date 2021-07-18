// ----------------------------------------------------------------------------
// --- Generic Ribbon Display Class                                         ---
// ----------------------------------------------------------------------------
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
    Text = PIXI.Text;

export class Ribbon {

    constructor(app, x, y, height, width, rightSideMarks,
        majorIntervalSize = 100, majorIntervals = 4, minorIntervals = 4, 
        allowNegative, colour_bar1, colour_bar2 ) {

        // --- set Parameters -----------------------------------------------------

        this.ribbonHeight = height;                        // height in pixels
        this.ribbonWidth = width;                          // width in pixels
        this.isRightAligned = rightSideMarks;               // position the ribbon relative to it's right edge

        this.ribbon_major_interval_size = majorIntervalSize;
        this.ribbon_major_intervals = majorIntervals;
        this.ribbon_minor_intervals = minorIntervals;

        this.ribbon_interval = this.ribbonHeight / this.ribbon_major_intervals;
        this.ribbon_minor_interval = this.ribbon_interval / this.ribbon_minor_intervals ;
        this.ribbon_interval_ratio = this.ribbon_interval / this.ribbon_major_interval_size;

        this.allowNegative = allowNegative;

        this.colour_bar1 = colour_bar1;
        this.colour_bar2 = colour_bar2;

        let mask_x, mask_y, i;

        // --- create a Container to hold the entire ribbon including text --------
        this.ribbon_container = new Container();

        // Setup for the ribbon to be to either right aligned or left aligned
        if (this.isRightAligned) {
            this.ribbonSideRight = -1;
        } else {
            this.ribbonSideRight = 1;
        }

        // BACKGROUND
        // --- create the semi-transparent background as a new GRAPHICS -------
        this.ribbon_background = new Graphics();

        let backgroundColour = 0x000000;
        let backgroundAlpha = 0.25;
        let backgroundOutlineWidth = 1;
        let backgroundOutlineAlpha = .25;


        this.ribbon_background.lineStyle(backgroundOutlineWidth,backgroundColour,backgroundOutlineAlpha,0);
        this.ribbon_background.beginFill(backgroundColour, backgroundAlpha);
        if (this.isRightAligned) {
            this.ribbon_background.drawRect(-width,-height/2, width, height);
        } else {
            this.ribbon_background.drawRect(0, -height/2, width, height);
        }

        console.log(height);
        
        this.ribbon_background.endFill();




        // TICK MARKS
        // --- create the ruler tick marks as a new GRAPHICS-------------------
        this.ruler = new Graphics()

        let rulerLineWidth = 2;
        let rulerColour = 0xffffff;

        this.ruler.lineStyle(rulerLineWidth, rulerColour);

        // calculate total number of tick marks required allowing for an 
        // additional major division at both the top and bottom of the ruler

        let totalIntervals = this.ribbon_minor_intervals * (this.ribbon_major_intervals + 2);
        
        this.rulerZeroIntervalOffset = totalIntervals/2 * this.ribbon_minor_interval;
        this.rulerZeroOffset = this.rulerZeroIntervalOffset / this.ribbon_interval_ratio;

        // check that the number of major intervals is evenly divisble by two
        if (this.ribbon_major_intervals % 2 != 0 ) {
            throw new Error("The number of major intervals must be divisible by two.");
        }

        let halfIntervals = totalIntervals / 2;

        for (i = -halfIntervals; i <= halfIntervals; i = i + 1){
            this.ruler.moveTo(0, i * this.ribbon_minor_interval);
            if ((i % this.ribbon_minor_intervals) == 0) {
                this.ruler.lineTo(this.ribbonSideRight * 20, i * this.ribbon_minor_interval );
            } else {
                this.ruler.lineTo(this.ribbonSideRight * 10, i * this.ribbon_minor_interval );
            }
        }

        // Draw vertical ruler line.
        //let rulerHeight = totalIntervals * this.ribbon_minor_interval;
        //this.ruler.moveTo(this.ribbonSideRight,rulerHeight);
        //this.ruler.lineTo(this.ribbonSideRight,-rulerHeight/2);

        // MASK
        // --- create the ribbon mask as a new GRAPHICS------------------------
        // Masks must be positioned absolutely

        if (this.isRightAligned == true) {
            mask_x = x - this.ribbonWidth;
        } else {
            mask_x = x;
        }

        mask_y = y - (this.ribbonHeight/2 );

        this.ribbon_mask = new Graphics();
        this.ribbon_mask.beginFill(0xFF0000);
        this.ribbon_mask.drawRect(mask_x,mask_y,this.ribbonWidth,this.ribbonHeight);
        this.ribbon_mask.endFill();

 

        // Position container and add Children and Mask
        // --- set the position of the container ----------------------------------
        // --- ruler container has 0 at the x,y value provided

        this.ribbon_container.position.set(x, y);

        this.ribbon_container.addChild(this.ribbon_background);
        if (this.colour_bar1 !== undefined) {
            this.ribbon_container.addChild(this.colour_bar1.graphics);
        }
        if (this.colour_bar2 !== undefined) {
            this.ribbon_container.addChild(this.colour_bar2.graphics);
        }
        this.ribbon_container.addChild(this.ruler);

        this.ribbon_container.mask = this.ribbon_mask;
        //console.log(this.ribbon_container);
        app.stage.addChild(this.ribbon_container);

        // --- create the text elements for the ribbon as TEXT-----------------
        // --- and add them to container

        let text_style = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "white",
            fontWeight: "normal"
            
        });

        // create an array to hold the Text objects for the ribbon
        this.text_stack = [];

        let halfMajorIntervals = this.ribbon_major_intervals / 2;

        // Create text objects 
        for (i = 0; i < (this.ribbon_major_intervals + 1); i = i + 1) {
            this.text_stack[i] = new Text(String(i*this.ribbon_major_interval_size), text_style);
            if (this.isRightAligned) {
                this.text_stack[i].anchor.set(1,.5);
            } else {
                this.text_stack[i].anchor.set(0,.5);
            }
            // This is a temporary place holder for position
            this.text_stack[i].position.set(this.ribbonSideRight * 30, (i - halfMajorIntervals) * this.ribbon_major_interval_size);
            this.ribbon_container.addChild(this.text_stack[i]);
        }
        
        this._value = 0;
        this.value = 0;
    }


// Value setter for Altimeter_Ribbon Object
    set value(new_value) { 
        var value_interval, remainder, i;

        // Only update the display if the value changed
        if (new_value == this._value) {
            return;
        }

        this._value = new_value;
        let interval = this.ribbon_major_interval_size;

        // if the numbers in 100 are evenly spaced we should have
        //   no more than 5 displayed at any one time

        if (new_value >= 0 ) {
            // positive altitude, round down
            value_interval = (Math.floor(new_value / interval) * interval) ;
        } else {
            // negative altitude, round up
            value_interval = (Math.ceil(new_value / interval) * interval) ;
        }
        remainder = new_value % interval;

        // Position the tickmarks
        /**
         * The ruler needs to be positioned at the bottom until it fills the 
         * display then we can begin just postioning it to based on the 
         * remainder
         */

        if (this.allowNegative == false ) {
            if (new_value < this.rulerZeroOffset) {
                console.log(this.rulerZeroOffset);

                this.ruler.position.set(0,(-this.rulerZeroOffset + new_value) * this.ribbon_interval_ratio);
            }
        } else {

            this.ruler.position.set(0, remainder * this.ribbon_interval_ratio);
        }

        // Display the values on the ribbon
        let halfMajorIntervals = this.ribbon_major_intervals / 2;

        for (i = 0; i < (this.ribbon_major_intervals + 1); i = i + 1) {
            // show values based on the remainder
            if (remainder < interval / 2) {
                let j = (i - halfMajorIntervals) ;
                // extra number goes to the bottom so that it can scroll up as we get to 0
                this.text_stack[i].position.set(this.ribbonSideRight * 30, (-j * interval + remainder) * this.ribbon_interval_ratio);
                let ribbonText;
                let ribbonNumber = j * interval + value_interval;
                if (ribbonNumber < 0 && this.allowNegative == false) {
                    ribbonText = "";
                } else {
                    ribbonText = String(ribbonNumber);
                }
                this.text_stack[i].text = ribbonText;
            } else {
                let j = i - halfMajorIntervals+1;
                // extra number goes to the top so that it can scroll down as we get to the interval
                this.text_stack[i].position.set(this.ribbonSideRight * 30, (-j * interval + remainder) * this.ribbon_interval_ratio);
                
                let ribbonText;
                let ribbonNumber = j * interval + value_interval;
                if (ribbonNumber < 0 && this.allowNegative == false) {
                    ribbonText = "";
                } else {
                    ribbonText = String(ribbonNumber);
                }
                this.text_stack[i].text = ribbonText;
            }
                
        }

        // Position the colour bar
        if (this.colour_bar1 !== undefined) {
            this.colour_bar1.value = new_value;
        }
        if (this.colour_bar2 !== undefined) {
            this.colour_bar2.value = new_value;
        }


    }

}

/**
 * 
 * @param colours 
 * @param width 
 * @param y_max 
 * @param scale 
 * @param right_aligned 
 */

export class Colour_Bar {
    constructor(colours = [], x_pos = 0, width = 5, y_max = 300, scale = 1, right_aligned = false) {
        this.colours = colours;
        this.x_pos = x_pos;
        //console.log(this.x);
        this.bar_y_max = y_max;
        this.bar_scale = scale;
        if (right_aligned == true) {
            this.bar_width = width * -1;
        } else {
            this.bar_width = width;
        }
        //console.log(this.bar_scale);

        

        // Create a new graphics object to hold the colour bar
        this.graphics = new Graphics();
        
        this.matrix = new PIXI.Matrix(1,0,0,-1 * this.bar_scale,0,0);
        this.graphics.setMatrix(this.matrix);
        
        let i;
        let length = colours.length;

        for (i = 0; i < length; i++ ){
            this.graphics.beginFill(colours[i].colour);
            if (i+1 < length) {
                this.graphics.drawRect(0, colours[i].position, this.bar_width, colours[i+1].position - colours[i].position);
            } else {
                this.graphics.drawRect(0, colours[i].position, this.bar_width, this.bar_y_max - colours[i].position); 
            }
        }

    }

    set value(new_value){

        this.graphics.position.set(this.x_pos,new_value * this.bar_scale);
    }

}