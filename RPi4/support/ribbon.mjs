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
        majorIntervalSize = 100, majorIntervals = 4, minorIntervals = 4) {

        // --- set Parameters -----------------------------------------------------

        this.ribbonHeight = height;                        // height in pixels
        this.ribbonWidth = width;                          // width in pixels
        this.ribbonPositionRight = rightSideMarks;      // position the ribbon relative to it's right edge

        this.ribbon_major_interval_size = majorIntervalSize;
        this.ribbon_major_intervals = majorIntervals;
        this.ribbon_minor_intervals = minorIntervals;

        this.ribbon_interval = this.ribbonHeight / this.ribbon_major_intervals;
        this.ribbon_minor_interval = this.ribbon_interval / this.ribbon_minor_intervals ;
        this.ribbon_interval_ratio = this.ribbon_interval / this.ribbon_major_interval_size;

        let mask_x, mask_y, i;

        // --- create a container to hold the entire ribbon including text --------
        this.ribbon_container = new Container();

        // Setup for the ribbon to be to either right aligned or left aligned
        if (this.ribbonPositionRight) {
            this.ribbonSideRight = -1;
        } else {
            this.ribbonSideRight = 1;
        }

        // --- create the semi-transparent background -----------------------------
        this.ribbon_background = new Graphics();
        this.ribbon_background.beginFill(0x000000, 0.15);  // black, 25%
        this.ribbon_background.drawRect(0, 0 ,this.ribbonSideRight * this.ribbonWidth, this.ribbonHeight);
        this.ribbon_background.endFill();

        // --- create the ruler tick marks ----------------------------------------
        this.ruler = new Graphics()
        this.ruler.lineStyle(2,0xFFFFFF);

        // calculate total number of tick marks required allowing for an 
        // additional major division at both the top and bottom of the ruler
        let totalIntervals = this.ribbon_minor_intervals * (this.ribbon_major_intervals + 2);
        
        // check that the number of major intervals is evenly divisble by two
        if (this.ribbon_major_intervals % 2 != 0 ) {
            throw new Error("The number of major intervals must be divisible by two.");
        }

        let halfIntervals = totalIntervals / 2;

        for (i = -halfIntervals; i < halfIntervals; i = i + 1){
            this.ruler.moveTo(0, i * this.ribbon_minor_interval);
            if ((i % this.ribbon_minor_intervals) == 0) {
                this.ruler.lineTo(this.ribbonSideRight * 20, i * this.ribbon_minor_interval );
            } else {
                this.ruler.lineTo(this.ribbonSideRight * 10, i * this.ribbon_minor_interval );
            }
        }

        // --- create the ribbon mask ---------------------------------------------
        // Masks must be positioned absolutely

        if (this.ribbonPositionRight == true) {
            mask_x = x - this.ribbonWidth;
        } else {
            mask_x = x;
        }

        mask_y = y - (this.ribbonHeight / 2);

        this.ribbon_mask = new Graphics();
        this.ribbon_mask.beginFill(0xFF0000);
        this.ribbon_mask.drawRect(mask_x,mask_y,this.ribbonWidth,this.ribbonHeight);
        this.ribbon_mask.endFill();

        // --- set the position of the container ----------------------------------
        // --- ruler container has 0 at the y value provided
        this.ribbon_container.position.set(x, y);

        this.ribbon_container.addChild(this.ribbon_background);
        this.ribbon_container.addChild(this.ruler);

        this.ribbon_container.mask = this.ribbon_mask;

        app.stage.addChild(this.ribbon_container);

        // --- create the text elements for the ribbon ----------------------------

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
            if (this.ribbonPositionRight) {
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
        this.ruler.position.set(0, remainder * this.ribbon_interval_ratio);

        // Display the values on the ribbon
        let halfMajorIntervals = this.ribbon_major_intervals / 2;

        for (i = 0; i < (this.ribbon_major_intervals + 1); i = i + 1) {
            // show values based on the remainder
            if (remainder < interval / 2) {
                let j = (i - halfMajorIntervals) ;
                // extra number goes to the bottom so that it can scroll up as we get to 0
                this.text_stack[i].position.set(this.ribbonSideRight * 30, (-j * interval + remainder) * this.ribbon_interval_ratio);
                this.text_stack[i].text = String(j * interval + value_interval);
            } else {
                let j = i - halfMajorIntervals+1;
                // extra number goes to the top so that it can scroll down as we get to the interval
                this.text_stack[i].position.set(this.ribbonSideRight * 30, (-j * interval + remainder) * this.ribbon_interval_ratio);
                this.text_stack[i].text = String(j * interval + value_interval );
            }
                
        }


    }
}
