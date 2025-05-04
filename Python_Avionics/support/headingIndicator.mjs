'use strict';

import { Container, Graphics, TextStyle, Text, CanvasTextMetrics } from './pixi.mjs';

/*****************************************************************************     
 * Class representing a Heading Indicator.
 * The indicator is designed for a height of 40 pixels.
 * The indicator is positioned at the top of the display.
 *****************************************************************************/
export class HeadingIndicator {
    
    /*************************************************************************
     * Constructor
     * @param {object} app Pixijs
     * @param {number} width the width of the horizontal ribbon
     *************************************************************************/

    constructor(app, width) {

        // TODO: Create some consistency for the screen width variable
        // get the size of the canvas used by the app
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;
        
        const height = 40;            // height of heading ribbon

        // Internal parameters for the heading value
        this._value = 0;
        this._previous_value = 0;
        this._bugValue = 5;

        /*********************************************************************
         * Create the graphics required for the horizontal ribbon
         *
         *********************************************************************/
        
        this.headingContainer = new Container();
        
        // Centre the container on the screen horizontally
        this.headingContainer.x = this.displayWidth/2;  

        // Create the mask for the container so that everything behind only 
        // the graphics in the mask area are displayed
        const headingMask = this.createMaskGraphics(height);
        this.headingContainer.mask = headingMask;

        // Create the container with the background for the ribbon
        const headingBackground = this.createBackgroundGraphics(height);

        // create the container with the ribbon (degree marks and labels)
        // created as a property so we can manipulate it as required in
        // other class functions
        this.headingRibbon = this.createRibbonContainer(height);
        const magnifierContainer = this.createMagnifierContainer(height);
        this.headingBugContainer = this.createHeadingBugContainer(height);
        this.selectableGraphics = this.createSelectableGraphic(height);
        
        [this.changableGraphics, this.bugText] = this.createChangableGraphic(height);
        
        this.bugText.text = "0";

        /*********************************************************************
         * add the graphics to the container
         * note that the mask needs to be rendered so it must also be added
         * to the app.
         *********************************************************************/

        this.headingContainer.addChild(headingBackground);
        this.headingContainer.addChild(headingMask);

        this.headingContainer.addChild(this.headingRibbon);
        this.headingContainer.addChild(this.headingBugContainer);
        this.headingContainer.addChild(magnifierContainer);

        /*********************************************************************
         * add the container to the display
         *********************************************************************/

        app.stage.addChild(this.headingContainer);
    }

    /*************************************************************************
     * Set the value of the heading indicator in degrees
     *************************************************************************/
    set value(new_value){

        if (new_value == this._previous_value) {
            return;
        }
        this._previous_value = new_value;
        new_value = new_value % 360;

        if (new_value < -0.5) {     // prevents 360 from being displayed
            new_value = 360 + new_value;
        }
        this._value = new_value;

        this.headingText.text = String(Math.round(this._value));

        this.headingRibbon.x = - this._value * this.pixelsPerDegree;
        
        this.positionHeadingBugOnRibbon();

    }
    /*************************************************************************
     * Create the background for the ribbon at the top of the screen
     * Start with a solid sky blue to obscure anything behind it, then add
     * 25% black.
     * 
     * @param {number} height The height of the graphic.
     * @returns {object} A PixiJS Graphics object.
     *************************************************************************/
    createBackgroundGraphics(height){
        const backgroundGraphics = new Graphics();

        backgroundGraphics.fillStyle = {
            alpha: 1.0,         // 100%
            color: 0x0000C0,    // skyColor
        }

        // Create rectangle. (upper left, size)
        backgroundGraphics.rect(-this.displayWidth/2, 0,
                                this.displayWidth, height);
        backgroundGraphics.fill();

        backgroundGraphics.fillStyle = {
            alpha: 0.25,        // 25%
            color: 0x000000,    // black
        }

        // Create rectangle. (upper left, size)
        backgroundGraphics.rect(-this.displayWidth/2, 0,
                                this.displayWidth, height);
        backgroundGraphics.fill();

        return (backgroundGraphics);
    }
    /*************************************************************************
     * Create a mask for the space occupied by the ribbon at the top of the
     *  screen
     * 
     * @param {number} width The width of the mask.
     * @returns {object} A PixiJS Graphics object.
     *************************************************************************/
    createMaskGraphics(height){
        const maskGraphics = new Graphics();

        maskGraphics.fillStyle = {
            color: 0xff0000,    // red
        }

        maskGraphics.rect(-this.displayWidth/2, 0,
                                     this.displayWidth, height);
        maskGraphics.fill();

        return (maskGraphics);
    }

    /*************************************************************************
     * Create a graphics and container object that is a horizontal ribbon to 
     * display the current heading.
     * 
     * @param {number} height The height of the ribbon on the display.
     * @returns {object} A PixiJS Container object
     *************************************************************************/
    createRibbonContainer(height){
        const horizontalRibbonContainer = new Container();
        const horizontalRibbonGraphics = new Graphics();
        
        // TODO: make this related to screen width 
        // Object parameter so it can be used elsewhere 
        const pixelsPerTenDegrees = 80;     // ideally divisible evenly by 10  
        const pixelsPerFiveDegrees = pixelsPerTenDegrees/2;
        this.pixelsPerDegree = pixelsPerTenDegrees/10;

        // The ribbon needs to be long enough so that an extra half of the 
        // width is available at each end so that the display is filled when
        // indicating the lowest or highest value.


        const extraRibbonTenDegrees = Math.ceil((this.displayWidth/2)/pixelsPerTenDegrees);
        this.extraRibbonDegrees = extraRibbonTenDegrees * 10;
        const extraRibbonWidth = extraRibbonTenDegrees * pixelsPerTenDegrees;
        
        // The start and end of the ribbon in pixels.
        const RibbonStart = -extraRibbonWidth;
        const RibbonEnd = (360 * this.pixelsPerDegree + extraRibbonWidth);

        const lineHeightDegree = 3;       // 3 pixels
        const lineHeightFiveDegree = 6;   // 6 pixels;
        const lineHeightTenDegree = 9;    // 9 pixels;

        let textStyle = new TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: 0xbbbbbb,             // gray
            fontWeight: "normal"  
        });

        horizontalRibbonGraphics.strokeStyle = {
            width: 1,           // 1 px
            color: 0xffffff,    // white
        }

        // loop through all the pixels required to drawing the ribbon
        // i is in pixels
        for(let i = RibbonStart; i <= RibbonEnd; i = i + this.pixelsPerDegree ){

            horizontalRibbonGraphics.moveTo(i, height);
            
            if (i % pixelsPerTenDegrees == 0 ) {
                let degrees = i / pixelsPerTenDegrees * 10;
                // adjust degrees so that it is between 0 and 359
                if (degrees < 0) {
                    degrees = degrees + 360;
                } else if (degrees > 359) {
                    degrees = degrees - 360;
                }
                // add one or two zeros to the degree string
                let degreesString = String(degrees);
                if (degreesString.length == 1) {
                    degreesString = "00" + degreesString;
                } else if (degreesString.length == 2) {
                    degreesString = "0" + degreesString;
                }

                // Create Text to display each 10 degrees
                const degreesText = new Text({
                    text: degreesString,
                    style: textStyle,
                });
                degreesText.anchor.set(0.5,.1);
                degreesText.position.set(i,4);
                horizontalRibbonContainer.addChild(degreesText);

                horizontalRibbonGraphics.lineTo(i, height - lineHeightTenDegree );
            
            } else if (i % pixelsPerFiveDegrees == 0) {
            
                horizontalRibbonGraphics.lineTo(i, height - lineHeightFiveDegree);
            
            } else {
            
                horizontalRibbonGraphics.lineTo(i, height - lineHeightDegree);
            
            }
        }
        horizontalRibbonGraphics.stroke();
 
        horizontalRibbonContainer.x = -this._value * this.pixelsPerDegree;
        horizontalRibbonContainer.addChild(horizontalRibbonGraphics)  
        return (horizontalRibbonContainer);
    }

    /*************************************************************************
     * Create the magnifier on the horizontal ribbon that will display the 
     * current heading. 
     * 
     * @param {*} height The height of the ribbon the magnifier is placed on
     * @returns {object} A PixiJS Container object
     *************************************************************************/
    createMagnifierContainer(height){
        const magnifierGraphics = new Graphics();
        const magnifierContainer = new Container();

        const lineWidth = 1;
        const magnifierWidth = 60;    // 60 pixels
        const magnifierHeight = height - 10;   // 35 pixel
        const magnifierOffset = 10 - lineWidth ;    // 8 px up from bottom of ribbon


        magnifierGraphics.strokeStyle = {
            alignment: 0,       // inside
            alpha: 1.0,         // 100%
            color: 0xffffff,    // white
            width: lineWidth,           // 2 px
        }

        magnifierGraphics.fillStyle = {
            color: 0x000000     // black
        }

        magnifierGraphics.moveTo(-magnifierWidth/2,-magnifierHeight-magnifierOffset); // top left
        magnifierGraphics.lineTo(magnifierWidth/2, -magnifierHeight-magnifierOffset); // top right
        magnifierGraphics.lineTo(magnifierWidth/2, -magnifierOffset); // bottom right
        magnifierGraphics.lineTo(magnifierOffset-2*lineWidth,-magnifierOffset);
        //magnifierGraphics.lineTo(magnifierOffset,-magnifierOffset);
        magnifierGraphics.lineTo(0,-2*lineWidth);
        magnifierGraphics.lineTo(-magnifierOffset+2*lineWidth,-magnifierOffset);
        //magnifierGraphics.lineTo(-magnifierOffset,-magnifierOffset);
        magnifierGraphics.lineTo(-magnifierWidth/2, -magnifierOffset);
        magnifierGraphics.closePath();

        magnifierGraphics.stroke();
        magnifierGraphics.fill();

        let textStyle = new TextStyle({
            fontFamily: "Tahoma",
            fontSize: 28,
            fill: "white",
            fontWeight: "bold",
            stroke: {
                color: "black",
                width: 1,
            },
        });

        let verticalCharacterCentre = this.calculateCharacterVerticalCentre(28);
        this.headingText = new Text({
            text: "0",
            style: textStyle,
        });
        this.headingText.anchor.set(0.5,verticalCharacterCentre );
        this.headingText.position.set(0, -magnifierHeight/2 - magnifierOffset);

        magnifierContainer.addChild(magnifierGraphics);
        magnifierContainer.addChild(this.headingText);

        magnifierContainer.y = height;

        return (magnifierContainer);
    }


    /*************************************************************************
     * 
     * @param {number} fontSizeToMeasure The font size to measure in points
     * @returns A ratio expressed as a number between 0 and 1 which which is 
     *    where the centre of the character is located vertically starting from
     *    the top. The value is used in an anchor setting to position the 
     *    characters vertically centered about a point
     *************************************************************************/
    
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
        const measureTextStyle = new TextStyle({
            fontFamily: fontFamily,
            fontSize: String(fontSize)+"px",
            fontWeight: fontWeight,
        });

        /** Get the character metrics */
        const sampleMetrics = CanvasTextMetrics.measureText("0123456789", measureTextStyle);

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


    /*************************************************************************
     * Create a PixiJS Graphics that draws the heading bug. The bug is drawn
     *     with it's default position at 0,0.
     * @param {number} ribbonHeight The height of the ribbon in pixels
     * @returns A PixiJS Graphics object
     *************************************************************************/
    createHeadingBugContainer(ribbonHeight) {

        const bugHeight = 6;             
        const bugWidth = 24;
        const bugLineColour = 0xFF0000; 
        const bugOutlineWidth = 1;
        const bugOutlineAlpha = 1;
        const bugOutlineAlignment = 0; // Inner
        const bugFillColour = 0xFF0000;
        const bugFillAlpha = 1;
        const bugTriangle = 6;
    
        // Create the Graphics

        const bugGraphics = new Graphics();
        const bugContainer = new Container();

        // Draw the bug clockwise

        bugGraphics.strokeStyle = {
            alignment: bugOutlineAlignment,
            alpha: bugOutlineAlpha,
            color: bugLineColour,
            width: bugOutlineWidth,
        };

        bugGraphics.fillStyle = {
            alpha: bugFillAlpha,
            color: bugFillColour,
        };

        const adjustBug = 0;
        bugGraphics.moveTo(0, ribbonHeight-adjustBug);
        bugGraphics.lineTo(-bugWidth/2, ribbonHeight-adjustBug);
        bugGraphics.lineTo(-bugWidth/2, ribbonHeight-adjustBug-bugHeight);
        bugGraphics.lineTo(-bugTriangle, ribbonHeight-adjustBug-bugHeight);
        bugGraphics.lineTo(0, ribbonHeight-adjustBug-(bugHeight-bugTriangle));
        bugGraphics.lineTo(bugTriangle, ribbonHeight-adjustBug-bugHeight);
        bugGraphics.lineTo(bugWidth/2, ribbonHeight-adjustBug-bugHeight);
        bugGraphics.lineTo(bugWidth/2, ribbonHeight-adjustBug);
        bugGraphics.closePath();

        bugGraphics.stroke();
        bugGraphics.fill();

        bugContainer.addChild(bugGraphics);

        return(bugContainer);
    }

    /*************************************************************************
     * Position the heading bug on the ribbon using the class properties 
     * _value and _bugValue to locate the bug.
     *************************************************************************/
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

        this.headingBugContainer.x =  (bugValue - this._value) * this.pixelsPerDegree;
    }

    /*************************************************************************
     * Create a PixiJS Graphics object that draws a horizontal line at the 
     *     bottom of the heading indicator to indicate the heading bug can
     *     be selected.
     * @param {number} height The height of the heading indicator ribbon in pixels.
     * @returns A PixiJS Graphics object that draws the selectable indicator
     * 
     *************************************************************************/
    createSelectableGraphic(height){

        const selectableGraphics = new Graphics();
        
        const horizontalLineWidth = 2

        selectableGraphics.strokeStyle = {
            alignment: 0,               // inner
            alpha: 1,                   // 100%
            color: 0xff0000,            // red
            width: horizontalLineWidth, // 2 px
        };

        selectableGraphics.moveTo(-this.displayWidth/2, height - horizontalLineWidth);
        selectableGraphics.lineTo(this.displayWidth/2, height - horizontalLineWidth);
        selectableGraphics.stroke()
    
        return selectableGraphics;
    }

    /*************************************************************************
     * Create a PixiJS Graphics object that draws a horizontal line at the
     *     bottom of the heading indicator, a leader and a box displaying the
     *     current heading bug setting to indicate the heading bug can be set
     * @param {number} height The height of the heading indicator ribbon in pixels. 
     * @returns A PixiJS Graphics object that draws the changable graphics.
     *
     *************************************************************************/
    createChangableGraphic(height) {
        
        const lineWidth = 2;              // 2px
        const boxHorizontalOffset = 10;   // 10px from left
        const boxHeight = 25;             // 25px
        const boxWidth = 40;              // 40px
        const boxCornerRadius = 5;        // 5px
        const bugFontSize = 21;           // 21pt font

        const yAnchor = this.calculateCharacterVerticalCentre(bugFontSize);
        const boxVerticalOffset = (height - boxHeight) / 2;

        var bugValueTextStyle = new TextStyle({
            fontFamily: "Tahoma",
            fontSize: bugFontSize,
            fill: 0x00ffff,
            fontWeight: "normal",
            stroke: 0x00ffff,
            
        });

        this.changableGraphicsContainer = new Container();        
        const leaderAndBoxGraphics = new Graphics();

        leaderAndBoxGraphics.strokeStyle = {
            alignment: 0,               // 0% out (in)
            alpha: 1,                   // 100%
            color: 0x00ffff,            // cyan
            width: lineWidth,           // 2 px
        };

        leaderAndBoxGraphics.fillStyle = {
            alpha: 1,                   // 100%
            color: 0x000000,            // Black
        };

        // draw horizontal line in new colour
        leaderAndBoxGraphics.moveTo(-this.displayWidth/2, height - lineWidth);
        leaderAndBoxGraphics.lineTo(this.displayWidth/2, height - lineWidth);
        leaderAndBoxGraphics.stroke();

        // draw the leader line
        leaderAndBoxGraphics.moveTo(this.displayWidth/2 - (boxWidth / 2 + boxHorizontalOffset), height);
        leaderAndBoxGraphics.lineTo(this.displayWidth/2 - (boxWidth / 2 + boxHorizontalOffset), height - boxVerticalOffset);
        leaderAndBoxGraphics.stroke();

        // draw the box
        let topLeftX = this.displayWidth/2 - (boxWidth + boxHorizontalOffset);
        let topLeftY = height - (boxHeight + boxVerticalOffset);
        
        leaderAndBoxGraphics.roundRect(topLeftX,topLeftY, boxWidth, boxHeight, boxCornerRadius);

        leaderAndBoxGraphics.stroke();
        leaderAndBoxGraphics.fill();

        this.changableGraphicsContainer.addChild(leaderAndBoxGraphics);

        let textX = this.displayWidth/2 - (boxHorizontalOffset + 2);
        let textY = height / 2;
        const bugText = new Text({
            text: "260",
            style: bugValueTextStyle,
        });

        bugText.anchor.set(1, yAnchor);
        bugText.position.set(textX, textY);

        this.changableGraphicsContainer.addChild(bugText);

        return [this.changableGraphicsContainer, bugText];
    }

    /*************************************************************************
     * callback will be called based on the users input to the rotary control.
     * Handles a call back from the main line to deal with selecting and
     * changing the bug value. We expect to be selected first then have
     * the changable flag added to allow changes. The value should be 
     * in sequence from where it was last.
     * @param {boolean} selected When true indicates this display element is selected 
     * @param {boolean} changable When true indicates this display element should 
     *     to the value parameter but only on the second pass through the function 
     * @param {*} value The value of the encoder when changeable is true
     *************************************************************************/
     callback(selected, changable, value){

        // Process changeable first as it should be enabled last
        // Assuming that were were last in selected state
        // TODO: add checks for selected state???
        if (changable && !this.changable) {
            // we just became changable - frist pass through the function
            this.changable = true;          // set the changable flag to true
            this.changeableFirstPass = true; 

            // clear the selected flag to allow detetion of a selected mode
            // when changable goes false
            // TODO: *** We need to remove this as we changed the logic
            this.selected = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is CHANGEABLE
            // TODO: We came from the SELECTED state
            //
            this.headingContainer.addChild(this.changableGraphicsContainer);
            //this.headingCircularContainer.addChild(this.changeableCircularGraphics);
            
            // TODO: Remove SELECTED element as we won't know to do this latter
            
            this.headingContainer.removeChild(this.selectableGraphics);
            //
            // ----------------------------------------------------------------            
        } //else REMOVED else if

        if (!changable && this.changable){
            // we just left the changable state
            this.changable = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is NOT CHANGEABLE
            //
            this.headingContainer.removeChild(this.changableGraphicsContainer);
            //
            // ----------------------------------------------------------------
            if (selected) {
                // we just left changeable but are still selected
                // ------------------------------------------------------------
                // TODO: Indcate that we are SELECTED after leaving changeable

                this.headingContainer.addChild(this.selectableGraphics);
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

            // TODO reposition the bug as the value changes
            //this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";
        } else if (this.changeableFirstPass) {
            // TODO: handle any first pas requirements
            this.changeableFirstPass = false;
        }
    }


}