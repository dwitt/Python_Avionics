/*global PIXI */
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


/**
 * Ribbon: 
 * Present a verticl ribbon on the screen that will scroll up or down based on
 * the value value parameter of the object.
 */    
export class Ribbon {

    /**
     * 
     * @param {PIXI.Application} app The current PixiJS application to place 
     *     the graphics objects in.
     * @param {number} x The horizontal position of the ribbon. The ribbon will be
     *     placed either right aligned or left aligned base on the 
     *     rightSideMarks parameter.
     * @param {number} y The vertical position of the mid point of the ribbon.
     * @param {number} height The ribbon height (pixels).
     * @param {number} width  The ribbon width (pixels).
     * @param {boolean} rightSideMarks True indicates that the ribbon tick marks
     *     will be on the right side (right side ribbon)
     * @param {number} majorIntervalSize The number of units per major interval
     * @param {number} majorIntervals The number of major divisions
     *     in the ribbon
     * @param {number} minorIntervals The number of minor division per major 
     *     division in the ribbon
     * @param {boolean} allowNegative True indicates negative values are permitted
     *     in the ribbon
     * @param {*} colour_bar1 
     * @param {*} colour_bar2 
     * @param {boolean} hasBug Tue indicates the ribbon should have an adjustable
     *     bug for the pilot to see a target value 
     */
    constructor(app, x, y, height, width, rightSideMarks,
        majorIntervalSize = 100, majorIntervals = 4, minorIntervals = 4, 
        allowNegative, colour_bar1, colour_bar2, hasBug = false ) {

        // --- set Parameters -----------------------------------------------------

        this.ribbonHeight = height;                        // height in pixels
        this.ribbonWidth = width;                          // width in pixels
        this.isRightAligned = rightSideMarks;               // position the ribbon relative to it's right edge

        this.ribbon_major_interval_size = majorIntervalSize;
        this.ribbon_major_intervals = majorIntervals;
        this.ribbon_minor_intervals = minorIntervals;

        // calculate intervals in pixels
        this.ribbon_interval = this.ribbonHeight / this.ribbon_major_intervals;                     // pixels / major interval
        this.ribbon_minor_interval_in_pixels = this.ribbon_interval / this.ribbon_minor_intervals;  // pixels / minor interval

        this.ribbon_interval_ratio = this.ribbon_interval / this.ribbon_major_interval_size;        // pixels / unit of value

        this.allowNegative = allowNegative;

        this.colour_bar1 = colour_bar1;
        this.colour_bar2 = colour_bar2;

        this.hasBug = hasBug;

        this._ribbonUndefined = false;

        this._bugValue = 0;
        this._bugZeroValue = 0;     // holds the most negative setting to all of no lag when adjusting up.

        let mask_x, mask_y, i;

        // --------------------------------------------------------------------
        // --- CREATE THE RIBBON CONTAINER
        // --------------------------------------------------------------------
        // --- create a Container to hold the entire ribbon including text --------
        this.ribbon_container = new Container();

        // Setup for the ribbon to be to either right aligned or left aligned
        if (this.isRightAligned) {
            this.ribbonSideRight = -1;
        } else {
            this.ribbonSideRight = 1;
        }
        // --------------------------------------------------------------------
        // BACKGROUND - Semi-transparent rectangle behind the ribbon
        //          called: ribbon_background
        // --------------------------------------------------------------------
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

        //console.log(height);
        
        this.ribbon_background.endFill();



        // --------------------------------------------------------------------
        // TICK MARKS - This graphic moves up or down as required to 
        //              position the tick marcks correctly
        //          called: ruler
        // --------------------------------------------------------------------
        // --- create the ruler tick marks as a new GRAPHICS-------------------
        this.ruler = new Graphics()

        // TODO: Move all variables to the top for easy access
        let rulerLineWidth = 2;
        let rulerColour = 0xBBBBBB;

        this.ruler.lineStyle(rulerLineWidth, rulerColour);

        // calculate total number of tick marks required allowing for an 
        // additional major division at both the top and bottom of the ruler

        let totalIntervals = this.ribbon_minor_intervals * (this.ribbon_major_intervals + 2);
        
        //TODO: Review these comments again

        // rulerZeroIntervalOffsetInPixels: is 1/2 of the total of all (minor) intervals
        //  multiplied by the number of pixels per interval
        //  -> this would be the offset from the zero point, down or up, to the 
        //     ruler
        // rulerZeroOffset: is the height of the moving ruler in pixels / pixels / unit of value
        // -> this would be the value that 1/2 the ruler represents.
        // TODO: this can be determined more simply

        this.rulerZeroIntervalOffsetInPixels = totalIntervals/2 * this.ribbon_minor_interval_in_pixels;
        this.rulerZeroOffset = this.rulerZeroIntervalOffsetInPixels / this.ribbon_interval_ratio; 

        // check that the number of major intervals is evenly divisble by two
        // TODO: figure out why this has to be
        if (this.ribbon_major_intervals % 2 != 0 ) {
            throw new Error("The number of major intervals must be divisible by two.");
        }

        // step through all the intervals and draw the ruller tick marks
        let halfIntervals = totalIntervals / 2;
        let largeTickMarkLength = 20;
        let smallTickMarkLength = 10;

        for (i = -halfIntervals; i <= halfIntervals; i = i + 1){
            this.ruler.moveTo(0, i * this.ribbon_minor_interval_in_pixels);
            if ((i % this.ribbon_minor_intervals) == 0) {
                this.ruler.lineTo(this.ribbonSideRight * largeTickMarkLength, i * this.ribbon_minor_interval_in_pixels );
            } else {
                this.ruler.lineTo(this.ribbonSideRight * smallTickMarkLength, i * this.ribbon_minor_interval_in_pixels );
            }
        }

        // Draw vertical ruler line.
        //let rulerHeight = totalIntervals * this.ribbon_minor_interval;
        //this.ruler.moveTo(this.ribbonSideRight,rulerHeight);
        //this.ruler.lineTo(this.ribbonSideRight,-rulerHeight/2);

        // --------------------------------------------------------------------
        // MASK - ensures only the desired tick marks and text appear in 
        //        the ribbon area
        //      called: ribbon_mask
        // --------------------------------------------------------------------
        // --- create the ribbon mask as a new GRAPHICS------------------------
        // *** Masks must be positioned absolutely

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

 
        // --------------------------------------------------------------------
        // Position container and add Children and Mask
        // --------------------------------------------------------------------
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

        // --------------------------------------------------------------------
        // --- create the text elements for the ribbon as TEXT-----------------
        // --- and add them to container
        // --------------------------------------------------------------------

        let text_style = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "#BBBBBB",
            fontWeight: "normal"
            
        });

        // create an array to hold the Text objects for the ribbon
        this.text_stack = [];

        let halfMajorIntervals = this.ribbon_major_intervals / 2;

        // Create text objects 
        for (i = 0; i < (this.ribbon_major_intervals + 1); i = i + 1) {
            this.text_stack[i] = new Text(String((i - halfMajorIntervals)*this.ribbon_major_interval_size), text_style);
            if (this.isRightAligned) {
                this.text_stack[i].anchor.set(1,.5);
            } else {
                this.text_stack[i].anchor.set(0,.5);
            }
            // This is a temporary place holder for position

            this.text_stack[i].position.set(this.ribbonSideRight * 30,-1 * (i - halfMajorIntervals) * this.ribbon_major_interval_size * this.ribbon_interval_ratio);
            this.ribbon_container.addChild(this.text_stack[i]);
        }

        //TODO: Place holder for now
        if (hasBug) {
            this.bugGraphic = this.createVerticalBug(this.isRightAligned);
            this.ribbon_container.addChild(this.bugGraphic);
            //this.positionBugOnRibbon();

            this.selectedGraphics = this.createSelectedGraphics(height, width, rightSideMarks);
            //this.ribbon_container.addChild(this.selectedGraphics);

            [this.changableGraphics, this.bugText] = this.createChangeableGraphics(height, width, rightSideMarks);
            this.bugText.text = "0"
            //this.ribbon_container.addChild(this.changableGraphics);
        }

        // --------------------------------------------------------------------
        // RED X
        // --- Create red X to display if the value is undefined            ---
        // --------------------------------------------------------------------

        this.badDataGraphic = new Graphics();

        this.badDataGraphic.lineStyle(2, 0xFF0000, 1,0);
    
        if (this.isRightAligned) {
            this.badDataGraphic.moveTo(-width,-height/2);
            this.badDataGraphic.lineTo(0, height/2);
            this.badDataGraphic.moveTo(0, -height/2);
            this.badDataGraphic.lineTo(-width, height/2);
        } else {
            this.badDataGraphic.moveTo(0,-height/2);
            this.badDataGraphic.lineTo(width, height/2);
            this.badDataGraphic.moveTo(width, -height/2);
            this.badDataGraphic.lineTo(0, height/2);
        }     

        
        // this._value = 0;
        // this.position_ribbon(0);

    }
    /**
     * Create a Pixijs Graphic containing the indicator bug for the ribbon
     * @param {boolean} isRightAligned When True aligns the bug on the right side of the ribbon
     * @returns PIXI.Graphics object that is the bug
     */
    createVerticalBug(isRightAligned){

        var bugHeight = 20;             
        var bugWidth = 8;
        var bugLineColour = 0xFF0000; 
        var bugOutlineWidth = 1;
        var bugOutlineAlpha = 1;
        var bugOutlinePosition = 0;
        var bugFillColour = 0xFF0000;
        var bugFillAlpha = 1;
        var bugTriangle = 5;

        var alignment;

        if (isRightAligned) {
            alignment = -1;
        } else {
            alignment = 1;
        }
 
        var bugGraphic = new Graphics();

        bugGraphic.lineStyle(bugOutlineWidth, bugLineColour, bugOutlineAlpha, bugOutlinePosition);
        bugGraphic.beginFill(bugFillColour, bugFillAlpha);

        /**
         * Draw the bug clockwise assuming it is right aligned. The bug
         * will be drawn counter clockwise if it is not right algined.
         */

        bugGraphic.moveTo(0,0);                                    // Origin
        bugGraphic.lineTo(0, bugHeight/2);                         // lower left
        bugGraphic.lineTo(alignment * bugWidth, bugHeight/2);      // lower right
        bugGraphic.lineTo(alignment * bugWidth, bugTriangle);      // start of triangle
        bugGraphic.lineTo(alignment * (bugWidth - bugTriangle), 0) // tip of triangle
        bugGraphic.lineTo(alignment * bugWidth, -bugTriangle);     // end of triangle
        bugGraphic.lineTo(alignment * bugWidth, - bugHeight/2);    // top left
        bugGraphic.lineTo(0, -bugHeight/2);                        // top right
        bugGraphic.lineTo(0,0);                                    // back to origin

        bugGraphic.endFill();

        return bugGraphic;
    }

    /**
     * Positions the bug at the correct place in the ribbon based on the bug's
     * setting and the current value being displayed on the ribbon
     * @param {number} ribbonDisplayValue The value displayed on the ribbon
     *     at the 0 positoin so that the bug can be positioned on the screen
     *     accordingly
     */
    positionBugOnRibbon(ribbonDisplayValue){
        var bugGraphicPosition = -1 * (this._bugValue - ribbonDisplayValue) * this.ribbon_interval_ratio;
        this.bugGraphic.position.set(0,bugGraphicPosition);  
    }

    /**
     * Create a graphic that indicates the bug is selected. The graphic will be
     *    a red line up the tick mark side of the ribbon with a red box at the
     *    bottome of the ribbon to display the bug value
     * @param {number} ribbonHeight Total height of ribbon in pixels
     * @param {number} ribbonWidth Total width of the ribbon in pixels
     * @param {boolean} isRightAligned True if the ribbon is right aligned
     * @returns PIXI.Graphics object that is the red line
     */
    createSelectedGraphics(ribbonHeight, ribbonWidth, isRightAligned){

        var verticallineColour = 0xFF0000;
        var outlineWidth = 2;
        var outlineAlpha = 1;
        var outlinePosition = 0; // inner

        var alignment;

        if (isRightAligned) {
            alignment = -1;
        } else {
            alignment = 1;
        }

        var selectedGraphicContainer = new Container();
        var lineAndBoxGraphic = new Graphics();

        // Draw vertical line
        lineAndBoxGraphic.lineStyle(outlineWidth, verticallineColour, outlineAlpha, outlinePosition);

        // Draw the line in from the edge to allow the width of the line to show
        lineAndBoxGraphic.moveTo(alignment * 2, ribbonHeight/2);
        lineAndBoxGraphic.lineTo(alignment * 2 , - ribbonHeight/2);

        selectedGraphicContainer.addChild(lineAndBoxGraphic);

        return selectedGraphicContainer;
    }

    /**
     * Create a graphic that indicates the bug is changable. The graphic will be
     *    a red leaderline with a red box at the bottom of the ribbon to display
     *    the bug's value
     * @param {number} ribbonHeight Total height of ribbon in pixels
     * @param {number} ribbonWidth Total width of the ribbon in pixels
     * @param {boolean} isRightAligned True if the ribbon is right aligned
     * @returns array containing PIXI.Graphis object that is the changable 
     *    Grapphics and Pixi.Text object that is the text displayed
     */
    createChangeableGraphics(ribbonHeight, ribbonWidth, isRightAligned){

        // TODO: remove not required - var outlineLineColour = 0xFF0000;
        var outlineColour = 0x00FFFF;
        var leaderLineWidth = 4;
        var leaderLinePosition = .5;
        var outlineWidth = 2;
        var outlineAlpha = 1;
        var outlinePosition = 0; // inner
        var fillColour = 0x000000;
        var fillAlpha = 1;
        var boxHorizontalOffset = 10;
        var boxHeight = 25;
        var boxVerticalOffset = 5;
        var boxCornerRadius = 7;

        var alignment;

        if (isRightAligned) {
            alignment = -1;
        } else {
            alignment = 1;
        }

        var bugTextStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 20,
            fill: "aqua",
            fontWeight: "normal"
            
        });

        var changableGraphicsContainer = new Container();

        var leaderAndBoxGraphic = new Graphics();

        // Draw vertical line in new colour
        leaderAndBoxGraphic.lineStyle(outlineWidth, outlineColour, outlineAlpha, outlinePosition);

        // Draw the line in from the edge to allow the width of the line to show
        leaderAndBoxGraphic.moveTo(alignment * 2, ribbonHeight/2);
        leaderAndBoxGraphic.lineTo(alignment * 2 , - ribbonHeight/2);

        // Draw leader line to the box
        leaderAndBoxGraphic.lineStyle(leaderLineWidth, outlineColour, outlineAlpha, leaderLinePosition);

        leaderAndBoxGraphic.moveTo(alignment * 2, ribbonHeight/2 - (boxVerticalOffset + boxHeight/2));
        leaderAndBoxGraphic.lineTo(alignment * boxHorizontalOffset, ribbonHeight/2 - (boxVerticalOffset + boxHeight/2));

        // Draw the box
        leaderAndBoxGraphic.lineStyle(outlineWidth, outlineColour, outlineAlpha, outlinePosition);

        let topLeftX = alignment * (ribbonWidth - boxHorizontalOffset);
        let topLeftY = ribbonHeight/2 - (boxVerticalOffset + boxHeight);
        let boxWidth = ribbonWidth - (2 * boxHorizontalOffset)
        
        leaderAndBoxGraphic.beginFill(fillColour, fillAlpha);
        leaderAndBoxGraphic.drawRoundedRect(topLeftX,topLeftY, boxWidth, boxHeight, boxCornerRadius);
        leaderAndBoxGraphic.endFill();

        changableGraphicsContainer.addChild(leaderAndBoxGraphic);

        let textBottomRightX = alignment * (boxHorizontalOffset + 3);
        let textBottomRightY = ribbonHeight/2 - (boxVerticalOffset + 2);
        var bugText = new Text("10000", bugTextStyle);
        bugText.anchor.set(1, 1);
        bugText.position.set(textBottomRightX, textBottomRightY);

        changableGraphicsContainer.addChild(bugText);

        return [changableGraphicsContainer, bugText];
    }


    /**
     * callback will be called based on the users input to the rotary control.
     * Handles a call back from the main line to deal with selecting and
     * changing the bug value. We expect to be selected first then have
     * the changable flag added to allow changes. The value should be 
     *in sequence from where it was last.
     * @param {boolean} selected When true indicates this display element is selected 
     * @param {boolean} changable When true indicates this display element should 
     *     to the value parameter but only on the second pass through the function 
     * @param {*} value The value of the encoder when changeable is true
     */
    callback(selected, changable, value){

        // Process changeable first as it should be enabled last
        if (changable && !this.changable) {
            // we just became changable
            this.changable = true; // set the changable flag to true
            this.changeableFirstPass = true; 

            // clear the selected flag to allow detetion of a selected mode
            // when changable goes false
            this.selected = false;

            // indicate that the bug is adjustable
            this.ribbon_container.addChild(this.changableGraphics);

        } else if (!changable && this.changable){
            // we just left the changable state
            this.changable = false;
            this.ribbon_container.removeChild(this.changableGraphics);
        }

        // check if selectied was just set while we are not changeable
        // if changable is set we can ignor this
        if (!changable && (selected && !this.selected)) {
            // we just became selected or we just left the changable state
            this.selected = true;

            // indicate that the bug is selectable
            // Place a red line down the side of the 
            this.ribbon_container.addChild(this.selectedGraphics);


        } else if (!selected && this.selected) {
            // we left the selected state
            this.selected = false;
            this.ribbon_container.removeChild(this.selectedGraphics);
        }

        // if (!selected && !changable) {
        //     // TODO: restore the normal screen
        //     // TODO: Consider moving this up so that it is only done once
            
        // }

        // TODO: remove the first pass test
        // process the encoder value provided
        if (changable && !this.changeableFirstPass) {

            if (value < this._bugZeroValue) {
                // The value is less than zero
                this._bugZeroValue = value;
            }
            this._bugValue = (value - this._bugZeroValue) * 100;
            this.bugText.text = this._bugValue.toString();
            this.positionBugOnRibbon(this._value);


        } else if (this.changeableFirstPass) {
            //handle any first pas requirements
            this.changeableFirstPass = false;
        }
    }

// Value setter for Ribbon Object
    set value(new_value) { 
        // check if new value undefined
        if (new_value === undefined && !this._ribbonUndefined) {
            // new value just changed to undefined
            this._ribbonUndefined = true
            this.ribbon_container.addChild(this.badDataGraphic);  
        } else if (new_value !== undefined && this._ribbonUndefined ) {
            // new value just changed to defined
            this.ribbon_container.removeChild(this.badDataGraphic);
            this._ribbonUndefined = false
        }

        if (new_value === undefined) {
            return;
        }

        // Only update the display if the value changed
        if (new_value == this._value) {
            return;
        }

        this._value = new_value;
        this.position_ribbon(new_value);
        if (this.hasBug) {
            this.positionBugOnRibbon(new_value);
        }
    }

    position_ribbon(new_value){
        var value_interval, remainder, i;

        let interval = this.ribbon_major_interval_size;

        // if the numbers in 100 are evenly spaced we should have
        //   no more than 5 displayed at any one time

        if (new_value >= 0 ) {
            // positive value, round down
            value_interval = (Math.floor(new_value / interval) * interval) ;
        } else {
            // negative value, round up
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
                //console.log(this.rulerZeroOffset);

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