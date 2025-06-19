'use strict';
import { Application, Graphics, Container, TextStyle,Text } from './pixi.mjs';

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

        // --------------------------------------------------------------------
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
        var outlineAlpha = 0.75;

        this.vsiBackground.strokeStyle = {
            alignment: 1.0,     // 1.0 is inside, 0.0 is outside
            color: fillColour,
            alpha: outlineAlpha,
            width: outlineWidth
        };

        this.vsiBackground.fillStyle = {
            alignment: 0.0,
            alpha: fillAlpha,
            color: fillColour,
            width: outlineWidth,
        };

        //
        //this.vsiBackground.lineStyle(outlineWidth, fillColour, outlineAlpha, 0);
        
        this.vsiBackground.rect(0, -height/2, width, height);
        this.vsiBackground.stroke();
        this.vsiBackground.fill();
        
        //console.log(height);


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

        const majorStrokeStyle = {
            alignment: 0.5,         // 1.0 is inside, 0.0 is outside
            color: lineColour,      // colour of the line
            alpha: 1.0,             // opacity of the line (100% = 1.0)
            width: majorLineWidth,  // width of the line
        };

        const minorStrokeStyle = {
            alignment: 0.5,         // 1.0 is inside, 0.0 is outside
            color: lineColour,      // colour of the line
            alpha: 1.0,             // opacity of the line (100% = 1.0)
            width: minorLineWidth,  // width of the line
        };

        this.vsiTickMarks.strokeStyle = {
            alignment: 0.5,         // 1.0 is inside, 0.0 is outside
            color: lineColour,      // colour of the line
            alpha: 1.0,             // opacity of the line (100% = 1.0)
            width: majorLineWidth,  // width of the line
        };

        //this.vsiTickMarks.lineStyle(majorLineWidth,lineColour);
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
        this.vsiTickMarks.strokeStyle = majorStrokeStyle;
        this.vsiTickMarks.moveTo(this.tickMarkOffsetFromLeft, tickMarkAreaHeight + 1);
        this.vsiTickMarks.lineTo(this.tickMarkOffsetFromLeft, -tickMarkAreaHeight - 1);
        this.vsiTickMarks.stroke();
 
        // Draw the tick marks

        let i;
        let j;
        let lineWidth;

        // set the line style for the tick marks


        // Draw the 0 to 1000 tick marks.
        for (i = -10; i <= 10; i = i + 1) {
            j = -(i * oneThousandsInterval);

            if ( i % 5 == 0) {
                this.vsiTickMarks.strokeStyle = majorStrokeStyle;

                this.vsiTickMarks.moveTo(this.tickMarkLargeOffsetFromLeft,j);
                this.vsiTickMarks.lineTo(this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength,j);
                this.vsiTickMarks.stroke();
            } else {
                this.vsiTickMarks.strokeStyle = minorStrokeStyle;

                this.vsiTickMarks.moveTo(this.tickMarkOffsetFromLeft,j);
                this.vsiTickMarks.lineTo(this.tickMarkOffsetFromLeft + this.tickMarkLength,j);
                this.vsiTickMarks.stroke();
            }
        }

        // Draw the 1500 to 2000 tick marks
        for (i = -2 ; i <= 2; i = i + 1) {
            j = -(i * twoThousandsInterval + Math.sign(i) * this.oneThousandsHeight);

            if ( i % 2 == 0) {
                this.vsiTickMarks.strokeStyle = majorStrokeStyle;
                this.vsiTickMarks.moveTo(this.tickMarkLargeOffsetFromLeft, j);
                this.vsiTickMarks.lineTo(this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength,j);
                this.vsiTickMarks.stroke();
            } else {
                this.vsiTickMarks.strokeStyle = minorStrokeStyle;
                this.vsiTickMarks.moveTo(this.tickMarkOffsetFromLeft, j);
                this.vsiTickMarks.lineTo(this.tickMarkOffsetFromLeft + this.tickMarkLength,j);
                this.vsiTickMarks.stroke();
            }
        }

        // add a zero indictor
        lineWidth = 2;
        lineColour = 0xffffff;      // white
        fillColour = 0xFFFFFF;      // white
        fillAlpha = 1.0;            // 0% opacity

        const triangleStrokeStyle = {
            alignment: 1.0,         // 1.0 is inside, 0.0 is outside
            color: lineColour,      // colour of the line
            alpha: 1.0,             // opacity of the line (100% = 1.0)
            width: lineWidth,       // width of the line
        };

        const triangleFillStyle = {
            alignment: 1.0,         // 1.0 is inside, 0.0 is outside
            alpha: fillAlpha,       // opacity of the fill (100% = 1.0)
            color: fillColour,      // colour of the fill
            width: lineWidth,       // width of the fill
        };

        this.vsiTickMarks.strokeStyle = triangleStrokeStyle;
        this.vsiTickMarks.fillStyle = triangleFillStyle;

        this.vsiTickMarks.poly(
           [this.width, -this.zeroTriangleHeight/2,
            this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength, 0, 
            this.width, this.zeroTriangleHeight/2],
            true
        );

        this.vsiTickMarks.stroke();
        this.vsiTickMarks.fill();


        // add text to tick marks

        // set text style
        let textStyle = new TextStyle(
            {
                fontFamily: "Tahoma",
                fontSize: 17,           // *** This seem incorrect 
                fill: "white",
                fontWeight: "normal",
                stroke: 
                {
                    color: "black",
                    width: 2,
                }
            },
        );

        let textOffset = (width - (this.tickMarkLargeOffsetFromLeft + this.tickMarkLargeLength))/2 + this.tickMarkLargeLength + this.tickMarkLargeOffsetFromLeft;

        let text = new Text(
            {
                text: ".5",
                style: textStyle,
            }
        );
        text.anchor.set(.6,.5);
        text.position.set(textOffset, oneThousandsInterval * 5);
        this.container.addChild(text);

        text = new Text(
            {
                text: ".5",
                style: textStyle,
            }
        );
        text.anchor.set(.6,.5);
        text.position.set(textOffset, -oneThousandsInterval * 5);
        this.container.addChild(text);

        textStyle = new TextStyle(
            {
                fontFamily: "Tahoma",
                fontSize: 22,
                fill: "white",
                fontWeight: "normal",
                stroke: 
                {
                    color: "black",
                    width: 2,
                }
            }
        );


        text = new Text(
            {
                text: "1",
                style: textStyle,
            }
        );
        text.anchor.set(.5,.5);
        text.position.set(textOffset, oneThousandsInterval * 10);
        this.container.addChild(text);

        text = new Text(
            {
                text: "1",
                style: textStyle,
            }
        );
        text.anchor.set(.5,.5);
        text.position.set(textOffset, -oneThousandsInterval * 10);
        this.container.addChild(text);        

        text = new Text(
            {
                text: "2",
                style: textStyle,
            }
        );
        text.anchor.set(.5,.5);
        text.position.set(textOffset, this.oneThousandsHeight + this.twoThousandsHeight);
        this.container.addChild(text);

        text = new Text(
            {
                text: "2",
                style: textStyle,
            }
        );
        text.anchor.set(.5,.5);
        text.position.set(textOffset, -this.oneThousandsHeight - this.twoThousandsHeight);

        this.container.addChild(text); 
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