'use strict';
//import Math
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

export class VsiIndicator {
    //TODO: should bring width into function
    constructor(app, x, y, height, width) {
        
        this.x = x;
        this.y = y;
        this.height = height;
        this.width = width;

        // Drawing will be relative to container except mask (if used)
        this.container = new Container();

        // invert y value
        // this.container.setTransform(0,0,0,-1);
        // set the position of the container
        this.container.position.set(this.x, this.y);

        this.vsiBackground = new Graphics();

        // fill the background with 25% black with a 75% outline
        var fillColour = 0x000000;
        var fillAlpha = 0.25;
        this.vsiBackground.beginFill(fillColour, fillAlpha);

        var outlineWidth = 1;
        var outlineAlpha = 0.75;

        this.vsiBackground.lineStyle(outlineWidth, fillColour, outlineAlpha);
        
        this.vsiBackground.drawRect(0, -height/2, width, height);

        // add the graphics to the container
        this.container.addChild(this.vsiBackground);

        // create graphics for tick marks
        this.vsiTickMarks = new Graphics();

        // draw the vertical line on the left
        var lineWidth = 2;
        var lineColour = 0xFFFFFF;

        this.vsiTickMarks.lineStyle(lineWidth,lineColour);
        var tickMarkOffsetFromLeft = 10;
        var tickMarkLength = 5;
        var tickMarkLargeOffsetFromLeft = 5;
        var tickMarkLargeLength = 10;

        this.vsiTickMarks.moveTo(tickMarkOffsetFromLeft, height/2);
        this.vsiTickMarks.lineTo(tickMarkOffsetFromLeft, -height/2);
 
        // setup and draw the tick marks


        var verticalCharacterSpace = 30;
        var oneThousandSpace = .75;
        var twoThousandSpace = .25;

        var tickMarkAreaHeight = height/2 - verticalCharacterSpace/2;
        var oneThousandsHeight = oneThousandSpace * tickMarkAreaHeight;
        var twoThousandsHeight = twoThousandSpace * tickMarkAreaHeight;
        var oneThousandsInterval = oneThousandsHeight / 10;
        var twoThousandsInterval = twoThousandsHeight / 2;





        var i;
        var j;
        for (i = -10; i <= 10; i = i + 1) {
            j = -(i * oneThousandsInterval);

            if ( i % 5 == 0) {
                lineWidth = 2;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(tickMarkLargeOffsetFromLeft,j);
                this.vsiTickMarks.lineTo(tickMarkLargeOffsetFromLeft + tickMarkLargeLength,j);
            } else {
                lineWidth = 1;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(tickMarkOffsetFromLeft,j);
                this.vsiTickMarks.lineTo(tickMarkOffsetFromLeft + tickMarkLength,j);
            }
        }

        for (i = -2 ; i <= 2; i = i + 1) {
            j = -(i * twoThousandsInterval + Math.sign(i) * oneThousandsHeight);

            if ( i % 2 == 0) {
                lineWidth = 2;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(tickMarkLargeOffsetFromLeft, j);
                this.vsiTickMarks.lineTo(tickMarkLargeOffsetFromLeft + tickMarkLargeLength,j);
            } else {
                lineWidth = 1;
                this.vsiTickMarks.lineStyle(lineWidth,lineColour);
                this.vsiTickMarks.moveTo(tickMarkOffsetFromLeft, j);
                this.vsiTickMarks.lineTo(tickMarkOffsetFromLeft + tickMarkLength,j);
            }
        }


        // add text to tick marks

        // set text style
        let textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 17,
            fill: "white",
            fontWeight: "normal" 
        });

        let textOffset = (width - (tickMarkLargeOffsetFromLeft + tickMarkLargeLength))/2 + tickMarkLargeLength + tickMarkLargeOffsetFromLeft;

        let text = new Text(".5", textStyle);
        text.anchor.set(.6,.5);
        text.position.set(textOffset, oneThousandsInterval * 5);
        this.vsiTickMarks.addChild(text);

        text = new Text(".5", textStyle);
        text.anchor.set(.6,.5);
        text.position.set(textOffset, -oneThousandsInterval * 5);
        this.vsiTickMarks.addChild(text);

        textStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "white",
            fontWeight: "normal" 
        });

        text = new Text("1", textStyle);
        text.anchor.set(.6,.5);
        text.position.set(textOffset, oneThousandsInterval * 10);
        this.vsiTickMarks.addChild(text);

        text = new Text("1", textStyle);
        text.anchor.set(.6,.5);
        text.position.set(textOffset, -oneThousandsInterval * 10);
        this.vsiTickMarks.addChild(text);        

        text = new Text("2", textStyle);
        text.anchor.set(.6,.5);
        text.position.set(textOffset, oneThousandsHeight + twoThousandsHeight);
        this.vsiTickMarks.addChild(text);

        text = new Text("2", textStyle);
        text.anchor.set(.6,.5);
        text.position.set(textOffset, -oneThousandsHeight - twoThousandsHeight);
        this.vsiTickMarks.addChild(text); 
        this.container.addChild(this.vsiTickMarks);
    
        app.stage.addChild(this.container);
    }
}