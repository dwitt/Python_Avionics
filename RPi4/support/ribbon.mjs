// ----------------------------------------------------------------------------
// --- Altimeter Ribbon                                                     ---
// ----------------------------------------------------------------------------
'use strict';

var Application = PIXI.Application,
    loader = PIXI.Loader.shared,
    resources = PIXI.Loader.shared.resources,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Rectangle = PIXI.Rectangle,
    Graphics = PIXI.Graphics,
    Container = PIXI.Container,
    Text = PIXI.Text;

export class Ribbon1 {

    constructor(app, x, y, height, width, right_side_marks) {

        // --- set Parameters -----------------------------------------------------

        this.ribbon_height = height;                        // height in pixels
        this.ribbon_width = width;                          // width in pixels
        this.ribbon_position_right = right_side_marks;      // position the ribbon relative to it's right edge

        //TODO: make these parameters
        this.ribbon_major_interval_size = 100;
        this.ribbon_major_intervals = 4
        this.ribbon_minor_intervals = 4;

        this.ribbon_interval = this.ribbon_height / this.ribbon_major_intervals;
        this.ribbon_minor_interval = this.ribbon_interval / this.ribbon_minor_intervals ;
        this.ribbon_interval_ratio = this.ribbon_interval / this.ribbon_major_interval_size;

        let ribbon_position, multiplier, mask_x, mask_y, i;

        // --- create a container to hold the entire ribbon including text --------
        this.ribbon_container = new Container();

        // Setup for the ribbon to be to either right aligned or left aligned
        if (this.ribbon_position_right) {
            ribbon_position = -1;
        } else {
            ribbon_position = 1;
        }

        // --- create the semi-transparent background -----------------------------
        this.ribbon_background = new Graphics();
        this.ribbon_background.beginFill(0x000000, 0.15);  // black, 25%
        this.ribbon_background.drawRect(0, 0 ,ribbon_position * this.ribbon_width, this.ribbon_height);
        this.ribbon_background.endFill();

        // --- create the ruler tick marks ----------------------------------------
        this.ruler = new Graphics()
        this.ruler.lineStyle(2,0xFFFFFF);

        // calculate total number of tick marks required allowing for a full range 
        // at both the top and bottom of the ruller
        let totalIntervals = this.ribbon_minor_intervals * (this.ribbon_major_intervals + 2);
        
        // assume that the number of major intervals is evenly divisble by two
        if (this.ribbon_major_intervals % 2 != 0 ) {
            throw new Error("The number of major intervals must be divisible by two.");
        }

        let halfIntervals = totalIntervals / 2;

        for (i = -halfIntervals; i < halfIntervals; i = i + 1){
            this.ruler.moveTo(0, i * this.ribbon_minor_interval);
            if ((i % this.ribbon_minor_intervals) == 0) {
                this.ruler.lineTo(ribbon_position * 20, i * this.ribbon_minor_interval );
            } else {
                this.ruler.lineTo(ribbon_position * 10, i * this.ribbon_minor_interval );
            }
        }

        // --- create the ribbon mask ---------------------------------------------
        // Masks must be positioned absolutely

        if (this.ribbon_position_right == true) {
            mask_x = x - this.ribbon_width;
        } else {
            mask_x = x;
        }

        mask_y = y - (this.ribbon_height / 2);

        this.ribbon_mask = new Graphics();
        this.ribbon_mask.beginFill(0xFF0000);
        this.ribbon_mask.drawRect(mask_x,mask_y,this.ribbon_width,this.ribbon_height);
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

        // TODO: Handle Left/right
        // create an array to hold the Text objects for the ribbon
        this.text_stack = [];

        let halfMajorIntervals = this.ribbon_major_intervals / 2;

        // Create text objects 
        for (i = 0; i < (this.ribbon_major_intervals + 1); i = i + 1) {
            this.text_stack[i] = new Text(String(i*this.ribbon_major_interval_size), text_style);
            this.text_stack[i].anchor.set(1,.5);
            // This is a temporary place holder for position
            this.text_stack[i].position.set(-30, (i - halfMajorIntervals) * this.ribbon_major_interval_size);
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
                this.text_stack[i].position.set(-30, (-j * interval + remainder) * this.ribbon_interval_ratio);
                this.text_stack[i].text = String(j * interval + value_interval);
            } else {
                let j = i - halfMajorIntervals+1;
                // extra number goes to the top so that it can scroll down as we get to the interval
                this.text_stack[i].position.set(-30, (-j * interval + remainder) * this.ribbon_interval_ratio);
                this.text_stack[i].text = String(j * interval + value_interval );
            }
                
        }


    }
}
