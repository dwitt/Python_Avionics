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
 * Class representing a VSI indicator.
 */

export class VsiIndicator {
    /**
     * Create a VSI Indicator
     * @param {PIXI.Application} app - The application to add this object to.
     * @param {number} x - The x location of the left edge of the VSI indicator.
     * @param {number} y - The y location of the vertical center of the VSI indicator.
     * @param {number} height - The height of the VSI indicator.
     * @param {number} width - The width of the VSI indicator.
     */
    constructor(app, x, y, height, width) {
        
        this.x = x;
        this.y = y;
        this.height = height;
        this.width = width;

        this._value = 0;

        var verticalCharacterSpace = 30;
        var oneThousandSpace = .75;
        var twoThousandSpace = .25;

        // Drawing will be relative to container except mask (if used)
        this.container = new Container();

        // set the position of the container
        this.container.position.set(this.x, this.y);

        // --------------------------------------------------------------------
        // Create the Background for the VSI Indicator.
        // This will have a dark transparent colour with a darker transparent
        // boarder.
        this.vsiBackground = new Graphics();

        // fill the background with 25% black with a 75% outline
        var fillColour = 0x000000;
        var fillAlpha = 0.25;
        var outlineWidth = 1;
        var outlineAlpha = 0.25;

        this.vsiBackground.beginFill(fillColour, fillAlpha);
        this.vsiBackground.lineStyle(outlineWidth, fillColour, outlineAlpha, 0);
        
        this.vsiBackground.drawRect(0, -height/2, width, height);
        console.log(height);
        this.vsiBackground.endFill

        // add the Background to the container
        this.container.addChild(this.vsiBackground);

        // --------------------------------------------------------------------
        // create VSI vertical indicator bar now so that is positioned above
        // the Background
        this.vsiIndicatorBar = new Graphics();

        this.container.addChild(this.vsiIndicatorBar);

        // --------------------------------------------------------------------
        // create Tick Marks, Numbering and Zero position.
        this.vsiTickMarks = new Graphics();

        var majorLineWidth = 2;
        var minorLineWidth = 1;
        var lineColour = 0xFFFFFF;

        this.vsiTickMarks.lineStyle(majorLineWidth,lineColour);
        this.tickMarkOffsetFromLeft = 10;
        this.tickMarkLength = 7.5;
        this.tickMarkLargeOffsetFromLeft = 10;
        this.tickMarkLargeLength = 10;

        var tickMarkAreaHeight = height/2 - verticalCharacterSpace/2;

        this.oneThousandsHeight = oneThousandSpace * tickMarkAreaHeight;
        this.twoThousandsHeight = twoThousandSpace * tickMarkAreaHeight;

        var oneThousandsInterval = this.oneThousandsHeight / 10;
        var twoThousandsInterval = this.twoThousandsHeight / 2;

        this.zeroTriangleHeight = oneThousandsInterval * 1.5;


        // draw the vertical line on the left
        this.vsiTickMarks.moveTo(this.tickMarkOffsetFromLeft, height/2);
        this.vsiTickMarks.lineTo(this.tickMarkOffsetFromLeft, -height/2);
 
        // Draw the tick marks

        let i;
        let j;
        let lineWidth;

        // Draw the 0 to 1000 tick marks.
        for (i = -10; i <= 10; i = i + 1) {
            j = -(i * oneThousandsInterval);

            if ( i % 5 == 0) {
                lineWidth = majorLineWidth;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(this.tickMarkLargeOffsetFromLeft,j);
                this.vsiTickMarks.lineTo(this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength,j);
            } else {
                lineWidth = minorLineWidth;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(this.tickMarkOffsetFromLeft,j);
                this.vsiTickMarks.lineTo(this.tickMarkOffsetFromLeft + this.tickMarkLength,j);
            }
        }

        // Draw the 1500 to 2000 tick marks
        for (i = -2 ; i <= 2; i = i + 1) {
            j = -(i * twoThousandsInterval + Math.sign(i) * this.oneThousandsHeight);

            if ( i % 2 == 0) {
                lineWidth = majorLineWidth;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(this.tickMarkLargeOffsetFromLeft, j);
                this.vsiTickMarks.lineTo(this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength,j);
            } else {
                lineWidth = minorLineWidth;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(this.tickMarkOffsetFromLeft, j);
                this.vsiTickMarks.lineTo(this.tickMarkOffsetFromLeft + this.tickMarkLength,j);
            }
        }

        // add a zero indictor
        lineWidth = 2;
        lineColour = 0xffffff;
        fillColour = 0x000000;
        fillAlpha = 0.0;

        this.vsiTickMarks.lineStyle(lineWidth, lineColour);
        this.vsiTickMarks.beginFill(fillColour, fillAlpha);

        this.vsiTickMarks.drawPolygon(this.width,-this.zeroTriangleHeight/2, this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength,0, this.width,this.zeroTriangleHeight/2);

        // add text to tick marks

        // set text style
        let textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 17,
            fill: "white",
            stroke: "black",
            strokeThickness: 2,
            fontWeight: "normal" 
        });

        let textOffset = (width - (this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength))/2 + this.tickMarkLargeLength + this.tickMarkLargeOffsetFromLeft;

        let text = new Text(".5", textStyle);
        text.anchor.set(.5,.5);
        text.position.set(textOffset, oneThousandsInterval * 5);
        this.vsiTickMarks.addChild(text);

        text = new Text(".5", textStyle);
        text.anchor.set(.5,.5);
        text.position.set(textOffset, -oneThousandsInterval * 5);
        this.vsiTickMarks.addChild(text);

        textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "white",
            stroke: "black",
            strokeThickness: 2,
            fontWeight: "normal" 
        });


        text = new Text("1", textStyle);
        text.anchor.set(.5,.5);
        text.position.set(textOffset, oneThousandsInterval * 10);
        this.vsiTickMarks.addChild(text);

        text = new Text("1", textStyle);
        text.anchor.set(.5,.5);
        text.position.set(textOffset, -oneThousandsInterval * 10);
        this.vsiTickMarks.addChild(text);        

        text = new Text("2", textStyle);
        text.anchor.set(.5,.5);
        text.position.set(textOffset, this.oneThousandsHeight + this.twoThousandsHeight);
        this.vsiTickMarks.addChild(text);

        text = new Text("2", textStyle);
        text.anchor.set(.5,.5);
        text.position.set(textOffset, -this.oneThousandsHeight - this.twoThousandsHeight);
        this.vsiTickMarks.addChild(text); 
        this.container.addChild(this.vsiTickMarks);


        app.stage.addChild(this.container);
    }

    /**
     * Setter for value of VSI Indicator
     */

    set value(newValue) {

        // check if the value has changed and return if it has not

        if (newValue == this._value) {
            return;
        } 


        let vsiBarHeight;
        // draw vertical bar

        // start by clearing the graphic
        this.vsiIndicatorBar.clear();

        // setup the fill parameters
        let colour = 0xc000c0;
        let vsiAlpha = 1.0;
        this.vsiIndicatorBar.beginFill(colour, vsiAlpha);

        // calculate bar height with direction
        
        // determine how many thousands
        let vsiThousands = Math.abs(newValue / 1000);

        // calculate the VSI bar height
        let vsiSign = Math.sign(newValue);

        if (vsiThousands < 1) {
            vsiBarHeight = -vsiSign * (vsiThousands * this.oneThousandsHeight);
        } else {
            vsiBarHeight = -vsiSign * (this.oneThousandsHeight 
                            + (vsiThousands - 1) * this.twoThousandsHeight);
        }

        // draw the VSI bar rectangle

        let vsiBarWidth = this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength - this.tickMarkOffsetFromLeft;
        let vsiBarX = this.tickMarkOffsetFromLeft;
        
        this.vsiIndicatorBar.drawRect(vsiBarX,0,vsiBarWidth,vsiBarHeight);
        
        colour = 0xffffff;
        let lineWidth = 1;
        let lineColour = 0x000000;

        this.vsiIndicatorBar.beginFill(colour, vsiAlpha);
        this.vsiIndicatorBar.lineStyle(lineWidth, lineColour);
        
        this.vsiIndicatorBar.drawPolygon(this.width,-this.zeroTriangleHeight/2+vsiBarHeight, this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength,vsiBarHeight, this.width,this.zeroTriangleHeight/2 + vsiBarHeight);

    }
}