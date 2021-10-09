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
 * Class representing a Heading Indicator.
 * The indicator is designed for a height of 40 pixels.
 * The indicator is positioned at the top of the display.
 */
export class HeadingIndicator {
    constructor(app, width) {
        this.displayWidth = app.screen.width;
        let height = 36;            // height of heading ribbon

        let fontFamily = "Tahoma";  // font name for this indictor
        let fontSize = 28;          // font size for the magnifier 
        let fontWeight = "bold";    // font weiht for the magnifier

        /** Internal variables variables for the heading value */
        this._value = 0;
        this._previous_value = 0;

        /** 
         * Height of a capital letter ivided by the height of the em square. Used
         * to calculate the center of the character veritcally
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
        let verticalCharacterCentre = ( digitAscentDistance - ((digitCapitalHeightRatio * fontSize)/2)) / (overallHeight);

        let headingContainer = new Container();

        /**********************************************************************
         * create the background for the heading indicator
         */

        let headingBackground = new Graphics();

        let backgroundColour = 0x000000;        // black
        let backgroundAlpha = 0.25;             // 25%
        let backgroundOutlineWidth = 1.0;       // 1px
        let backgroundOutlineColour = 0x000000; // black
        let backgroundOutlineAlpha = 0.25;      // 25%

        headingBackground.lineStyle(backgroundOutlineWidth, backgroundOutlineColour, backgroundOutlineAlpha);
        
        headingBackground.beginFill(backgroundColour, backgroundAlpha);
        headingBackground.drawRect(-width/2, 0, width, height);
        headingBackground.endFill();

        // position the heading background
        headingBackground.x = this.displayWidth / 2 ;

        /**********************************************************************
         * Create a mask for the ribbon
         */

        let headingMask = new Graphics();

        let maskColour = 0xFF0000;              // red

        headingMask.beginFill(maskColour);
        headingMask.drawRect(-width/2, 0, width, height);
        headingMask.endFill();

        headingMask.x = this.displayWidth / 2;

        headingContainer.mask = headingMask;

        /**********************************************************************
         * Create the horizontal ribbon with tick marks and numbers.
         * This needs to extend beyond 0 and 360 so that it fills the display
         * when we are at 0/360 degrees.
         * The amount to be extended will be based on the width requested. The 
         * ribbon needs to include enough additional space at each end to fill
         * the space left in the ribbon.
         * This means that the extra is 1/2 the ribbon width
         */

        this.headingRibbon = new Graphics();

        let pixelsPerTenDegrees = 80; 
        let pixelsPerFiveDegrees = pixelsPerTenDegrees / 2;
        this.pixelsPerDegree = pixelsPerTenDegrees/10;
        let extraRibbonWidth = (Math.ceil((width/2)/pixelsPerTenDegrees) * pixelsPerTenDegrees );
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


        this.headingRibbon.lineStyle(lineWidth, lineColour);

        for(let i = RibbonStart; i <= RibbonEnd; i = i + this.pixelsPerDegree ){
            this.headingRibbon.moveTo(i, height);
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
                this.headingRibbon.addChild(degreesText);

                this.headingRibbon.lineTo(i, height - lineHeightTenDegree );
            } else if (i% pixelsPerFiveDegrees == 0) {
                this.headingRibbon.lineTo(i, height - lineHeightFiveDegree);
            } else {
                this.headingRibbon.lineTo(i, height - lineHeightDegree);
            }
        }

        this.headingRibbon.x = this.displayWidth/2 - this._value * this.pixelsPerDegree;  

        /**********************************************************************
         * create the Ribbon Magnifier
         */

         let magnifierGraphics = new Graphics();

        let magnifierWidth = 60;                // 60 pixels
        let magnifierHeight = 30;               // 35 pixel
        let magnifierOffset = 5 ;

        lineWidth = 2;
        lineColour = 0xBBBBBB;
        let lineAlpha = 1.0
        let lineAlignment = 0.5;

        let magnifierFillColour = 0x000000;     // Black

        magnifierGraphics.beginFill(magnifierFillColour);
        magnifierGraphics.drawRect(-magnifierWidth/2, -(magnifierHeight + magnifierOffset),
            magnifierWidth, magnifierHeight); 
        magnifierGraphics.endFill();
        magnifierGraphics.beginFill(magnifierFillColour);
        magnifierGraphics.drawPolygon(
            5, -magnifierOffset,
            0, 5-magnifierOffset,
            -5,-magnifierOffset
        );
        magnifierGraphics.endFill();

        magnifierGraphics.lineStyle(lineWidth, lineColour, lineAlpha, lineAlignment);
        magnifierGraphics.moveTo(-magnifierWidth/2,-magnifierHeight-magnifierOffset);
        magnifierGraphics.lineTo(magnifierWidth/2, -magnifierHeight-magnifierOffset);
        magnifierGraphics.lineTo(magnifierWidth/2, -magnifierOffset);
        magnifierGraphics.lineTo(5,-magnifierOffset);
        magnifierGraphics.lineTo(0,5-magnifierOffset);
        magnifierGraphics.lineTo(-5,-magnifierOffset);
        magnifierGraphics.lineTo(-magnifierWidth/2, -magnifierOffset);
        magnifierGraphics.closePath();

        // TODO: Remove the following. It is for testing only

        textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 28,
            fill: "white",
            fontWeight: "bold"//,
            //stroke: "black",
            //strokeThickness: 1
            
        });

        this.headingText = new Text("0", textStyle);
        this.headingText.anchor.set(0.5,verticalCharacterCentre );
        this.headingText.position.set(0, -magnifierHeight/2 - 5);
        
        magnifierGraphics.addChild(this.headingText);

        magnifierGraphics.x = this.displayWidth/2;
        magnifierGraphics.y = height;

        /**********************************************************************
         * add the graphics to the container
         */


        headingContainer.addChild(headingMask);
        headingContainer.addChild(headingBackground);
        headingContainer.addChild(this.headingRibbon);
        headingContainer.addChild(magnifierGraphics);
        
        /**********************************************************************
         * add the container to the display
         */

        app.stage.addChild(headingContainer);

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

        this.headingRibbon.x = this.displayWidth/2 - this._value * this.pixelsPerDegree;
        
        
    }
}