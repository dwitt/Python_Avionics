/*global PIXI */
'use strict';
// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
// var Application = PIXI.Application,
//     loader = PIXI.Loader.shared,
//     resources = PIXI.Loader.shared.resources,
//     TextureCache = PIXI.utils.TextureCache,
//     Sprite = PIXI.Sprite,
//     Rectangle = PIXI.Rectangle,
// var Graphics = PIXI.Graphics,
//     Container = PIXI.Container,
//     Text = PIXI.Text;

/**     
 * Class representing a Heading Indicator.
 * The indicator is designed for a height of 40 pixels.
 * The indicator is positioned at the top of the display.
 */
export class HeadingIndicator {
    /**
     * 
     * @param {object} app Pixijs
     * @param {number} width thw width of the horizontal ribbont
     * @param {boolean} horizontal True if a horizontal ribbon required
     * @param {boolean} circular True if a circular ribbon required
     */
    constructor(app, width, horizontal, circular ) {

        // TODO: Create some consistency for the screen width variable
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;
        
        let height = 36;            // height of heading ribbon

        /** Internal variables variables for the heading value */
        this._value = 0;
        this._previous_value = 0;
        this._bugValue = 0;

        /**********************************************************************
         * Create the graphics required for the horizontal ribbon
         *
         **********************************************************************/

        this.headingContainer = new Container();
        this.headingContainer.x = this.displayWidth/2;  // centre the container on the screen

        let headingBackground = this.createHorizontalBackground(width, height);
        let headingMask = this.createHorizontalMask(width, height);
        this.headingContainer.mask = headingMask;

        this.headingRibbon = this.createHorizontalRibbon(width, height);
        let magnifierGraphics = this.createHorizontalMagnifierGraphics(height);

        this.headingBugGraphics = this.createHeadingBug(height);

        this.selectableGraphics = this.createSelectableGraphic(width, height);
        [this.changableGraphics, this.bugText] = this.createChangableGraphic(width, height);
        this.bugText.text = "0";

        /**********************************************************************
         * add the graphics to the container
         * note that the mask needs to be rendered so it must also be added
         * to the app somehow.
         */

        this.headingContainer.addChild(headingMask);
        this.headingContainer.addChild(headingBackground);
        this.headingContainer.addChild(this.headingRibbon);
        this.headingContainer.addChild(this.headingBugGraphics);
        this.headingContainer.addChild(magnifierGraphics);
        /**********************************************************************
         * add the container to the display
         */

        if (horizontal) { 
            app.stage.addChild(this.headingContainer);
        }

        /**********************************************************************
         * Create a Circular heading Indicator at the bottom of the display
         **********************************************************************/
    
        // find the smallest screen dimension and use it to determine the size 
        // of all arcs

        let minimum_screen = Math.min(app.screen.width, app.screen.height);
        let radius = (minimum_screen / 2 ) - 0 ;    // duplicated in the drawing of the BankArc
        let xOrigin = this.displayWidth / 2 ;
        let yOrigin = this.displayHeight  + .65 * radius;

        /**
         * Create the Circular Container and move it to its origin
         */
        this.headingCircularContainer = new Container();
        this.headingCircularContainer.x = xOrigin;
        this.headingCircularContainer.y = yOrigin;

        /**
         * Create the graphics
         */

        let headingCircularBackground = this.createCircularBackground(radius);
        this.headingCircularForeground = this.createCircularHeadingForeground(radius);
        this.circularBug = this.createCircularHeadingBug(radius);
        let circularPointer = this.createCircularHeadingPointer(yOrigin);

        this.selectedCircularGraphics = this.createCircularSelectableGraphic(radius);
        [this.changeableCircularGraphics, this.circularBugText ] = this.createChangableCircularGraphic(radius);
        this.circularBugText.text = "0";

        /**
         * Add the graphics to the container
         */


        this.headingCircularContainer.addChild(headingCircularBackground);
        this.headingCircularContainer.addChild(this.headingCircularForeground);
        this.headingCircularContainer.addChild(this.circularBug);
        this.headingCircularContainer.addChild(circularPointer);

        if (circular) {
            app.stage.addChild(this.headingCircularContainer);
        }


    }

    /**
     * Create the horizontal background for the ribbon at the top of the screen
     * 
     * @param {number} width The width of the horizontal ribbon.
     * @param {number} height The height of the horizontal ribbon.
     * 
     * @returns {object} A PixiJS Graphics object.
     */
    createHorizontalBackground(width, height){
        var graphics = new Graphics();

        let backgroundColour = 0x000000;        // black
        let backgroundAlpha = 0.25;             // 25%
        let backgroundOutlineWidth = 1.0;       // 1px
        let backgroundOutlineColour = 0x000000; // black
        let backgroundOutlineAlpha = 0.25;      // 25%

        graphics.lineStyle(backgroundOutlineWidth, backgroundOutlineColour, backgroundOutlineAlpha);
        
        graphics.beginFill(backgroundColour, backgroundAlpha);
        graphics.drawRect(-width/2, 0, width, height);
        graphics.endFill();

        // position the heading background
        //TODO: Remove positioning of the background and position the container
        //graphics.x = this.displayWidth / 2 ;

        return (graphics);
    }
    /**
     * Create a mask for the space occupied by the ribbon at the top of the screen
     * 
     * @param {number} width The width of the mask.
     * @param {number} height The height of the mask.
     * @returns {object} A PixiJS Graphics object.
     */
    createHorizontalMask(width, height){
        var graphics = new Graphics();

        let maskColour = 0xFF0000;              // red

        graphics.beginFill(maskColour);
        graphics.drawRect(-width/2, 0, width, height);
        graphics.endFill();

        return (graphics);
    }

    /**
     * Create a graphics object that is a horizontal ribbon to display the current
     * heading.
     * @param {number} width The width of the ribbon on the display.
     * @param {number} height The height of the ribbon on the display.
     * @returns {object} A PixiJS Graphics object
     */
    createHorizontalRibbon(width, height){
        var graphics = new Graphics();

        let pixelsPerTenDegrees = 80; 
        let pixelsPerFiveDegrees = pixelsPerTenDegrees/2;
        this.pixelsPerDegree = pixelsPerTenDegrees/10;

        // The ribbon needs to be long enough so that an extra half of the 
        // width is available at each end so that the display is filled when
        // indicating the lowest or highest value.
        let extraRibbonTenDegrees = Math.ceil((width/2)/pixelsPerTenDegrees);
        this.extraRibbonDegrees = extraRibbonTenDegrees * 10;
        let extraRibbonWidth = extraRibbonTenDegrees * pixelsPerTenDegrees;
        
        let RibbonStart = -extraRibbonWidth;
        let RibbonEnd = (360 * pixelsPerTenDegrees + extraRibbonWidth);
        
        let lineWidth = 1;              // 1 pixel
        let lineColour = 0xFFFFFF;      // white
        let lineHeightDegree = 3;       // 5 pixels
        let lineHeightFiveDegree = 6;   // 10 pixels;
        let lineHeightTenDegree = 9;   // 15 pixels;

        let textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "#BBBBBB",
            fontWeight: "normal"  
        });


        graphics.lineStyle(lineWidth, lineColour);

        for(let i = RibbonStart; i <= RibbonEnd; i = i + this.pixelsPerDegree ){
            graphics.moveTo(i, height);
            if (i % pixelsPerTenDegrees == 0 ) {
                let degrees = i/pixelsPerTenDegrees*10;
                if (degrees < 0) {
                    degrees = degrees + 360;
                } else if (degrees > 359) {
                    degrees = degrees - 360;
                }
                let degreesString = String(degrees);
                if (degreesString.length == 1) {
                    degreesString = "00" + degreesString;
                } else if (degreesString.length == 2) {
                    degreesString = "0" + degreesString;
                }

                let degreesText = new Text(degreesString,textStyle);
                degreesText.anchor.set(0.5,.1);
                degreesText.position.set(i,4);
                graphics.addChild(degreesText);

                graphics.lineTo(i, height - lineHeightTenDegree );
            } else if (i% pixelsPerFiveDegrees == 0) {
                graphics.lineTo(i, height - lineHeightFiveDegree);
            } else {
                graphics.lineTo(i, height - lineHeightDegree);
            }
        }

        //graphics.x = this.displayWidth/2 - this._value * this.pixelsPerDegree;  
        graphics.x = - this._value * this.pixelsPerDegree;  
        return (graphics);
    }
    /**
     * Create the magnifier on the horizontal ribbont that will display the 
     * current heading. 
     * @param {*} height The height of the ribbon the magnifier is placed on
     * @returns 
     */
    createHorizontalMagnifierGraphics(height ){
        let graphics = new Graphics();

        let magnifierWidth = 60;                // 60 pixels
        let magnifierHeight = 30;               // 35 pixel
        let magnifierOffset = 5 ;

        let lineWidth = 2;
        let lineColour = 0xBBBBBB;
        let lineAlpha = 1.0
        let lineAlignment = 0.5;

        let magnifierFillColour = 0x000000;     // Black

        graphics.beginFill(magnifierFillColour);
        graphics.drawRect(-magnifierWidth/2, -(magnifierHeight + magnifierOffset),
            magnifierWidth, magnifierHeight); 
        graphics.endFill();
        graphics.beginFill(magnifierFillColour);
        graphics.drawPolygon(
            5, -magnifierOffset,
            0, 5-magnifierOffset,
            -5,-magnifierOffset
        );
        graphics.endFill();

        graphics.lineStyle(lineWidth, lineColour, lineAlpha, lineAlignment);
        graphics.moveTo(-magnifierWidth/2,-magnifierHeight-magnifierOffset);
        graphics.lineTo(magnifierWidth/2, -magnifierHeight-magnifierOffset);
        graphics.lineTo(magnifierWidth/2, -magnifierOffset);
        graphics.lineTo(5,-magnifierOffset);
        graphics.lineTo(0,5-magnifierOffset);
        graphics.lineTo(-5,-magnifierOffset);
        graphics.lineTo(-magnifierWidth/2, -magnifierOffset);
        graphics.closePath();

        let textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 28,
            fill: "white",
            fontWeight: "bold"//,
            //stroke: "black",
            //strokeThickness: 1
            
        });

        let verticalCharacterCentre = this.calculateCharacterVerticalCentre(28);
        this.headingText = new Text("0", textStyle);
        this.headingText.anchor.set(0.5,verticalCharacterCentre );
        this.headingText.position.set(0, -magnifierHeight/2 - 5);
        
        graphics.addChild(this.headingText);

        //graphics.x = this.displayWidth/2;
        graphics.y = height;

        return (graphics);
    }


    /**
     * 
     * @param {number} fontSizeToMeasure The font size to measure in points
     * @returns A ratio expressed as a number between 0 and 1 which which is 
     *    where the centre of the character is located vertically starting from
     *    the top. The value is used in an anchor setting to position the 
     *    characters vertically centered about a point
     */
    calculateCharacterVerticalCentre(fontSizeToMeasure){

        let fontFamily = "Tahoma";          // font name for this indictor
        let fontSize = fontSizeToMeasure;   // font size for the magnifier 
        let fontWeight = "bold";            // font weight for the magnifier

        /** 
         * Height of a capital letter divided by the height of the em square. Used
         * to calculate the center of the character veritcally.
         * This is font specific.
         */
        let digitCapitalHeightRatio = 1489/2048; 

        /**
         * Create a style to use when measuring the character sizes
         */
        let measureTextStyle = new PIXI.TextStyle({
            fontFamily: fontFamily,
            fontSize: String(fontSize)+"px",
            fontWeight: fontWeight
        });

        /** Get the character metrics */
        let sampleMetrics = PIXI.TextMetrics.measureText("0123456789", measureTextStyle);

        let digitAscentDistance = sampleMetrics.fontProperties.ascent;
        let overallHeight = sampleMetrics.height; 

        /** Calculate where the center of the character is vertically
         *  as a ratio of the height of the sample message. (value between 0 and 1)
         *  This is used for the anchor command.
         *  Then add 2 pixels
         */
        var verticalCharacterCentre = ( digitAscentDistance - ((digitCapitalHeightRatio * fontSize)/2)) / (overallHeight);

        return(verticalCharacterCentre);
    }


    /**
     * Create a PixiJS Graphics that draws the heading bug. The bug is drawn
     *     with it's default position at 0,0.
     * @param {number} ribbonHeight The height of the ribbon in pixels
     * @returns A PixiJS Graphics object
     */
    createHeadingBug(ribbonHeight) {

        var bugHeight = 7;             
        var bugWidth = 26;
        var bugLineColour = 0xFF0000; 
        var bugOutlineWidth = 1;
        var bugOutlineAlpha = 1;
        var bugOutlineAlignment = 0; // Inner
        var bugFillColour = 0xFF0000;
        var bugFillAlpha = 1;
        var bugTriangle = 7;
    
        // Create the Graphics

        var bugGraphics = new Graphics();

        // Draw the bug clockwise

        bugGraphics.lineStyle(bugOutlineWidth, bugLineColour, bugOutlineAlpha, bugOutlineAlignment);

        bugGraphics.moveTo(0, ribbonHeight);
        bugGraphics.beginFill(bugFillColour, bugFillAlpha);

        bugGraphics.lineTo(-bugWidth/2, ribbonHeight);
        bugGraphics.lineTo(-bugWidth/2, ribbonHeight-bugHeight);
        bugGraphics.lineTo(-bugTriangle, ribbonHeight-bugHeight);
        bugGraphics.lineTo(0, ribbonHeight-(bugHeight-bugTriangle));
        bugGraphics.lineTo(bugTriangle, ribbonHeight-bugHeight);
        bugGraphics.lineTo(bugWidth/2, ribbonHeight-bugHeight);
        bugGraphics.lineTo(bugWidth/2, ribbonHeight);
        bugGraphics.lineTo(0, ribbonHeight);

        bugGraphics.endFill();

        return(bugGraphics);
    }

    /**
     * Position the heading bug on the ribbon using the class properties _value
     *    and _bugValue to locate the bug.
     */
    positionHeadingBugOnRibbon(){
        var bugValue = this._bugValue;


        // check if we are displaying the extra bit of ribbon
        if (this._value < this.extraRibbonDegrees) {
            // extra ribbon is being displayed to the left of the magnifier
            // check if the bug should be in the extra
            if (bugValue > (360 - this.extraRibbonDegrees)) {
                // the bug needs to be displayed early
                bugValue = bugValue - 360;
            }
        } else if (this._value > (360 - this.extraRibbonDegrees)) {
            // we are displaying the extra at the right of the magnifier
            // check if bug should be in the extra
            if (bugValue < this.extraRibbonDegrees) {
                // the bug needs to be displayed late
                bugValue = bugValue + 360;
            }
        }
        this.headingBugGraphics.x = this.displayWidth/2 + (bugValue - this._value) * this.pixelsPerDegree
    }

    /**
     * Create a PixiJS Graphics object that draws a horizontal line at the 
     *     bottom of the heading indicator to indicate the heading bug can
     *     be selected.
     * @param {number} width The width of the heading indicator ribbon in pixels. 
     * @param {number} height The height of the heading indicator ribbon in pixels.
     * @returns A PixiJS Graphics object that draws the selectable indicator
     */
    createSelectableGraphic(width, height){

        var horizontalLineColour = 0xFF0000;
        var horizontalLineWidth = 2;
        var horizontalLineAlpha = 1;
        var horizontalLineAlignment = 0; // inner

        var selectableGraphics = new Graphics();

        selectableGraphics.lineStyle(horizontalLineWidth, horizontalLineColour, horizontalLineAlpha, horizontalLineAlignment);

        selectableGraphics.moveTo(0, height - horizontalLineWidth);
        selectableGraphics.lineTo(width, height - horizontalLineWidth);
    
        return selectableGraphics;
    }

    /**
     * Create a PixiJS Graphics object that draws a horizontal line at the
     *     bottom of the heading indicator, a leader and a box displaying the
     *     current heading bug setting to indicate the heading bug can be set
     * @param {number} width The width of the heading indicator ribbon in pixels. 
     * @param {number} height The height of the heading indicator ribbon in pixels. 
     * @returns A PixiJS Graphics object that draws the changable graphics.
     */
    createChangableGraphic(width, height) {
        
        var outlineColour = 0x00FFFF;
        var leaderLineWidth = 4;
        var leaderLineAlignment = .5;
        var outlineWidth = 2;
        var outlineAlpha = 1;
        var outlineAlignment = 0; // inner
        var fillColour = 0x000000;
        var fillAlpha = 1;
        var boxHorizontalOffset = 10;
        var boxHeight = 25;
        var boxWidth = 40;
        //var boxVerticalOffset = 5;
        var boxCornerRadius = 7;

        var bugValueTextStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 20,
            fill: "aqua",
            fontWeight: "normal"
            
        });

        var yAnchor = this.calculateCharacterVerticalCentre(20);

        let boxVerticalOffset = (height - boxHeight) / 2;

        var changableGraphicsContainer = new Container();

        var leaderAndBoxGraphics = new Graphics();

        // draw horizontal line in new colour
        leaderAndBoxGraphics.lineStyle(leaderLineWidth, outlineColour, outlineAlpha, leaderLineAlignment);

        leaderAndBoxGraphics.moveTo(0, height - outlineWidth);
        leaderAndBoxGraphics.lineTo(width, height - outlineWidth);

        // draw the leader line
        leaderAndBoxGraphics.moveTo(width - (boxWidth / 2 + boxHorizontalOffset), height);
        leaderAndBoxGraphics.lineTo(width - (boxWidth / 2 + boxHorizontalOffset), height - boxVerticalOffset);

        // draw the box
        leaderAndBoxGraphics.lineStyle(outlineWidth, outlineColour, outlineAlpha, outlineAlignment);


        let topLeftX = width - (boxWidth + boxHorizontalOffset);
        let topLeftY = height - (boxHeight + boxVerticalOffset);
        
        
        leaderAndBoxGraphics.beginFill(fillColour, fillAlpha);
        leaderAndBoxGraphics.drawRoundedRect(topLeftX,topLeftY, boxWidth, boxHeight, boxCornerRadius);
        leaderAndBoxGraphics.endFill();

        changableGraphicsContainer.addChild(leaderAndBoxGraphics);

        let textX = width - (boxHorizontalOffset + 3);
        let textY = height / 2;
        var bugText = new Text("260", bugValueTextStyle);
        bugText.anchor.set(1, yAnchor);
        bugText.position.set(textX, textY);

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
        // Assuming that were were last in selected state
        // TODO: add checks for selected state???
        if (changable && !this.changable) {
            // we just became changable
            this.changable = true; // set the changable flag to true
            this.changeableFirstPass = true; 

            // clear the selected flag to allow detetion of a selected mode
            // when changable goes false
            // TODO: *** We need to remove this as we changed the logic
            this.selected = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is CHANGEABLE
            // TODO: We came from the SELECTED state
            //
            this.headingContainer.addChild(this.changableGraphics);
            this.headingCircularContainer.addChild(this.changeableCircularGraphics);
            
            // TODO: Remove SELECTED element as we won't know to do this latter
            
            this.headingCircularContainer.removeChild(this.selectedCircularGraphics);
            //
            // ----------------------------------------------------------------            
        } //else REMOVED else if

        if (!changable && this.changable){
            // we just left the changable state
            this.changable = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is NOT CHANGEABLE
            //
            this.headingContainer.removeChild(this.changableGraphics);
            this.headingCircularContainer.removeChild(this.changeableCircularGraphics);
            //
            // ----------------------------------------------------------------
            if (selected) {
                // we just left changeable but are still selected
                // ------------------------------------------------------------
                // TODO: Indcate that we are SELECTED after leaving changeable

                this.headingCircularContainer.addChild(this.selectedCircularGraphics);
                //
                // ------------------------------------------------------------
            }
        }

        // check if selected was just set while we are not changeable
        // if changable is set we can ignore this
        if (!changable && (selected && !this.selected)) {
            // we just became selected 
            this.selected = true;

            // ----------------------------------------------------------------
            // TODO: Indicate that the element is SELECTABLE
            //
            this.headingContainer.addChild(this.selectableGraphics);
            this.headingCircularContainer.addChild(this.selectedCircularGraphics);
            


            //
            // ----------------------------------------------------------------

        } //else REMOVED else if

        if (!selected && this.selected) {
            // we left the selected state
            this.selected = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is NOT SELECTABLE
            // TODO: This should only occur when going to the NOT SELECTED and
            //          NOT CHANGEABLE state
            this.headingContainer.removeChild(this.selectableGraphics);
            this.headingCircularContainer.removeChild(this.selectedCircularGraphics);
        }

        if (!selected && !changable) {
            // TODO: restore the normal screen
            // TODO: Consider moving this up so that it is only done once
            
        }

        // ====================================================================
        // process the encoder value provided
        if (changable && !this.changeableFirstPass) {

            if (value >= 0) {
                this._bugValue = value % 360;
            } else {
                this._bugValue = 360 + (value % 360);
            }
            this.bugText.text = this._bugValue.toString();

            this.positionHeadingBugOnRibbon(this._value);

            this.circularBug.angle = - this._value + this._bugValue;
            this.circularBugText.text = this._bugValue.toString();

            // TODO reposition the bug as the value changes
            //this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";
        } else if (this.changeableFirstPass) {
            // TODO: handle any first pas requirements
            this.changeableFirstPass = false;
        }
    }

    set value(new_value){

        if (new_value == this._previous_value) {
            return;
        }
        this._previous_value = new_value;
        new_value = new_value % 360;

        if (new_value < 0) {
            new_value = 360 + new_value;
        }
        this._value = new_value

        //TODO: Format this text properly
        this.headingText.text = String(this._value);

        //this.headingRibbon.x = this.displayWidth/2 - this._value * this.pixelsPerDegree;
        this.headingRibbon.x = - this._value * this.pixelsPerDegree;
        //TODO: check if new_value is required and remove it
        this.positionHeadingBugOnRibbon(new_value);

        /**
         * Position circular heading and bug indicator by rotation
         */
        
        this.headingCircularForeground.angle = - this._value;
        this.circularBug.angle = - this._value + this._bugValue;

    }


    createCircularBackground(radius){
        // Set the background colours and styles
        let graphics = new Graphics();

        let backgroundColour = 0x000000;        // black
        let backgroundAlpha = 0.50;             // 25%
        let backgroundOutlineWidth = 1.0;       // 1px
        let backgroundOutlineColour = 0x000000; // black
        let backgroundOutlineAlpha = 0.25;      // 25%

        graphics.lineStyle(backgroundOutlineWidth, 
            backgroundOutlineColour, 
            backgroundOutlineAlpha);

        // Draw the darkened background
        // Located it at 0,0 then move it to the correct position

        graphics.beginFill(backgroundColour, backgroundAlpha);
        graphics.drawCircle(0,0,radius);
        graphics.endFill();

        return graphics;
    }

    createCircularHeadingForeground(radius){

        let graphics = new Graphics();

        let lineineWidth = 2.0
        let lineColour = 0xffffff;
        let lineAlpha = 1.0;

        graphics.lineStyle(lineineWidth,
            lineColour,
            lineAlpha);

        let textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "#ffffff",
            fontWeight: "normal"  
        });

        // Set the length of the various tick marks
        let shortLength = 5;
        let longLength = 15;
        let midLength =10

        // Declare variables
        let startLength;
        let angleRadians;
        let x,y;
        let degreesString;
        let xStart, xFinish, yStart, yFinish;

        for(let i = 0; i <= 360; i = i + 5) {
            // Draw tick marks every 5 degrees
            // Define 0 degrees as vertical up
            if (i % 30 == 0) {
                startLength = radius - longLength;
            } else if ( i % 10 == 0 ){
                startLength = radius - midLength;
            } else {
                startLength = radius - shortLength;
            }
            angleRadians = Math.PI * i / 180;

            y = - Math.cos(angleRadians);
            x = Math.sin(angleRadians); 

            xStart = x * startLength;
            yStart = y * startLength;

            xFinish = x * radius;
            yFinish = y * radius;

            graphics.moveTo(xStart, yStart);
            graphics.lineTo(xFinish, yFinish);

            // Add text
            if (i % 30 == 0) {
                if (i % 90 == 0) {
                    if (i == 90) {
                        degreesString = "E";
                    } else if (i == 180) {
                        degreesString = "S";
                    } else if (i == 270) {
                        degreesString = "W";
                    } else {
                        degreesString = "N";
                    }
                } else {
                    degreesString = String(i / 10);
                }
                let text = new Text(degreesString,textStyle);
                text.anchor.set(0.5,0);
                text.position.set(xStart,yStart);
                text.rotation = angleRadians;

                graphics.addChild(text);
            }
        }
        return graphics;
    }

    /**
     * 
     * @param {number} radius The radius of the heading indicator
     * @returns 
     */
    createCircularHeadingBug(radius) {

        var height = 10;             
        var width = 30;
        var lineColour = 0xFF0000; 
        var outlineWidth = 0;
        var outlineAlpha = 1;
        var outlineAlignment = 1; // Inner
        var fillColour = 0xFF0000;
        var fillAlpha = 1;
        var triangle = 9;
    
        // Create the Graphics

        var graphics = new Graphics();

        // Draw the bug clockwise at the 0 degreee position.
        // The centre of the indicator is at x=0, y=0. +ve is down and to the right
        // 

        graphics.lineStyle(outlineWidth, lineColour, outlineAlpha, outlineAlignment);

        let halfAngle = Math.atan((width/2) / radius);
        let xPrime, yPrime;
        let x1, x2, x3, x4, x5;
        let y1, y2, y3, y4, y5;

        xPrime = Math.sin(halfAngle);
        yPrime = Math.cos(halfAngle);

        x1 = 0;
        y1 = -radius;

        x2 = -radius * xPrime;
        y2 = -radius * yPrime;
        
        x3 = -(radius - height) * xPrime;
        y3 = -(radius - height) * yPrime;

        x4 = -triangle/2;
        y4 = y3;

        x5 = 0
        y5 = -(radius - height + triangle);



        graphics.moveTo(x1, y1);
        graphics.beginFill(fillColour, fillAlpha);

        graphics.lineTo(x2, y2);
        graphics.lineTo(x3, y3);
        graphics.lineTo(x4, y4);
        graphics.lineTo(x5, y5);
        graphics.lineTo(-x4, y4);
        graphics.lineTo(-x3, y3);
        graphics.lineTo(-x2, y2);
        graphics.lineTo(-x1, y1);

        graphics.endFill();

        //graphics.angle = -180;

        return(graphics);
    
    }

    createCircularHeadingPointer(yOrigin){
        let height = 30;             
        let width = 20;
        let lineColour = 0xFFFFFF; 
        let outlineWidth = 2;
        let outlineAlpha = 1;
        let outlineAlignment = 0; // Inner
        let fillColour = 0x000000;
        let fillAlpha = 1;
    
        let yDisplayBottom =  -(yOrigin - this.displayHeight);
        // Create the Graphics

        var graphics = new Graphics();

        // Draw the bug clockwise at the 0 degreee position

        graphics.lineStyle(outlineWidth, lineColour, outlineAlpha, outlineAlignment);
        graphics.moveTo(-width/2, yDisplayBottom);
        graphics.beginFill(fillColour, fillAlpha);
        graphics.lineTo(0,(yDisplayBottom - height));
        graphics.lineTo(width/2, yDisplayBottom);
        graphics.lineTo(-width/2, yDisplayBottom);
        graphics.endFill();

        return(graphics);
    }

    /**
     * Create a circular graphic that is coloured to indicate that the heading
     * indicator bug can be selected to allow positioning of the bug.
     * @param {number} radius 
     * @returns PIXI.JS Graphics Object
     */
    createCircularSelectableGraphic(radius){
        // Set the background colours and styles
        let graphics = new Graphics();

        let outlineWidth = 2.0;       // 1px
        let outlineColour = 0xFF0000; // red
        let outlineAlpha = 1.0;      // 100%%
        var outlineAlignment = 1; // inner

        graphics.lineStyle(outlineWidth, 
            outlineColour, 
            outlineAlpha,
            outlineAlignment);

        // Draw the darkened background
        // Located it at 0,0 then move it to the correct position

        graphics.drawCircle(0,0,radius);

        return graphics;
    }

    /**
     * Create a PixiJS Graphics object that draws a circle around
     *      the heading indicator, a leader and a box displaying the
     *      current heading bug setting to indicate the heading bug can be set
     * @param {number} radius The radius of the heading indicator circle.
     * @returns A PixiJS Graphics object that draws the changable graphics.
     */
     createChangableCircularGraphic(radius) {
        
        var outlineColour = 0x00FFFF;
        var leaderLineWidth = 2;
        var leaderLineAlignment = .5;
        var outlineWidth = 2;
        var outlineAlpha = 1;
        var outlineAlignment = 1; // inner
        var fillColour = 0x000000;
        var fillAlpha = 1;
        var boxHeight = 25;
        var boxWidth = 40;
        //var boxVerticalOffset = 5;
        var boxCornerRadius = 7;

        var bugValueTextStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 20,
            fill: "aqua",
            fontWeight: "normal"
            
        });

        var yAnchor = this.calculateCharacterVerticalCentre(20);

        var boxVerticalOffset = radius + 10;
        
        var container = new Container();
        var graphics = new Graphics();

        // draw circular  line in new colour
        graphics.lineStyle(outlineWidth, outlineColour, outlineAlpha, outlineAlignment);
        graphics.drawCircle(0,0,radius);

        // draw the leader line
        graphics.lineStyle(leaderLineWidth, outlineColour, outlineAlpha, leaderLineAlignment);
        graphics.moveTo(0, - radius);
        graphics.lineTo(0, - boxVerticalOffset);



        // draw the box
        graphics.lineStyle(outlineWidth, outlineColour, outlineAlpha, outlineAlignment);


        let topLeftX = - boxWidth / 2;
        let topLeftY = - boxVerticalOffset - boxHeight;
        
        
        graphics.beginFill(fillColour, fillAlpha);
        graphics.drawRoundedRect(topLeftX,topLeftY, boxWidth, boxHeight, boxCornerRadius);
        graphics.endFill();

        container.addChild(graphics);

        var textX = boxWidth/2 - 3;
        var textY = - boxVerticalOffset - (boxHeight / 2);
        var bugText = new Text("260", bugValueTextStyle);
        bugText.anchor.set(1, yAnchor);
        bugText.position.set(textX, textY);

        container.addChild(bugText);

        return [container, bugText];
    }
}