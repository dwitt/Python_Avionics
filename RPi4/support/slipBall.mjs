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
 * Class representing a Slip Ball Indicator.
 */
export class SlipBallIndicator {
    constructor(app) {
        this._acc100 = 0;
        this._acc = 0;

        // parameters for smoothing
        this._smoothed = 0;
        this._smoothing = 400;
        this.lastUpdate = new Date;

        // all co-ordinates about the center of this indicator
        let displayHeight = app.screen.height;
        let displayWidth = app.screen.width;

        let positionFromBottom = 50; // pixels
        this.ballDiameter = 20; // pixels
        this.indicatorSize = 3; // multiplier

        let slipBallContainer = new Container();

        // Construct the inclinometer background

        let slipBallBackgroundGraphics = new Graphics();

        let bgColour = 0x000000; // black
        let bgAlpha = 0.25 // 25%

        let lineWidth = 1; // pixels
        let lineColour = 0x000000; // black

        slipBallBackgroundGraphics.lineStyle(lineWidth, lineColour);
        slipBallBackgroundGraphics.beginFill(bgColour, bgAlpha);

        slipBallBackgroundGraphics.drawRoundedRect(
            -this.indicatorSize * this.ballDiameter - this.ballDiameter/2 - 2, -this.ballDiameter/2 - 2,
            2 * this.indicatorSize * this.ballDiameter + this.ballDiameter + 4, this.ballDiameter + 4,
            this.ballDiameter/2 + 2
            );
        


        // Add the graphics to the container
        slipBallContainer.addChild(slipBallBackgroundGraphics);

        // position the container
        slipBallContainer.x = displayWidth / 2;
        slipBallContainer.y = displayHeight - positionFromBottom;

        // create the slip ball
        this.slipBallGraphics = new Graphics();

        let lineAlpha = 1;
        let lineAlignment = 0.5; // inside
        lineColour = 0x000000; //black
        let fillColour = 0xFFFFFF; //white
        let fillAlpha = 1;

        this.slipBallGraphics.lineStyle(lineWidth, lineColour, lineAlpha, lineAlignment);
        this.slipBallGraphics.beginFill(fillColour, fillAlpha);

        this.slipBallGraphics.drawCircle(0,0,this.ballDiameter/2);
        
        slipBallContainer.addChild(this.slipBallGraphics);

        // Construct the inclinometer bars

        let slipBallBarGraphics = new Graphics();

        lineWidth = 2; // pixel
        lineColour = 0xFFFFFF; // white

        slipBallBarGraphics.lineStyle(lineWidth, lineColour);
        slipBallBarGraphics.moveTo( -this.ballDiameter/2 - 1, -this.ballDiameter/2 - 1);
        slipBallBarGraphics.lineTo( -this.ballDiameter/2 - 1, +this.ballDiameter/2 + 1);

        slipBallBarGraphics.moveTo( this.ballDiameter/2 + 1, -this.ballDiameter/2 - 1);
        slipBallBarGraphics.lineTo( this.ballDiameter/2 + 1, +this.ballDiameter/2 + 1);

        slipBallContainer.addChild(slipBallBarGraphics);

        // add the container to the app
        app.stage.addChild(slipBallContainer);

    }

    /**
     * Set the acceleration felt by the slip ball
     */


    set acc(newValue) {
        // if (newValue == this._acc100) {
        //     return;
        // }
        if (isNaN(newValue)){ // check for NaN
            newValue = 0;
        }
        this._acc100 = newValue;
        this._acc = this.smoothedValue(newValue/100);

        // caluclate effective angle of slip or skid
        let angle = Math.asin(this._acc/9.81) * 180 / Math.PI;
        let sign = Math.sign(angle);

        let horizontalPosition = Math.min(Math.abs(angle),30) * sign * this.indicatorSize * this.ballDiameter / 30;
        this.slipBallGraphics.x = horizontalPosition;

    }

    smoothedValue(newValue){
        let now = new Date;
        let elapsedTime = now - this.lastUpdate;
        this._smoothed = this._smoothed +  elapsedTime * (newValue - this._smoothed) / this._smoothing;
        this.lastUpdate = now;
        return this._smoothed;
    }
}