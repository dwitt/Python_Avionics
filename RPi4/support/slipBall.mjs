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
        this._acc100Z = 0;
        this._accZ = 0;
        this._acc100Y = 0;
        this._accY = 0;

        // parameters for smoothing
        this._smoothedZ = 0;
        this._smoothedY = 0;
        this._smoothing = 400;
        this._lastUpdateZ = new Date;
        this._lastUpdateY = new Date

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


    update() {


        // caluclate effective angle of slip or skid

        // let angle = Math.asin(this._acc/9.81) * 180 / Math.PI;
        let angle = Math.atan(this._accY / this._accZ) * 180 / Math.PI;
        let sign = Math.sign(angle);

        let horizontalPosition = Math.min(Math.abs(angle),10) * sign * this.indicatorSize * this.ballDiameter / 10;
        this.slipBallGraphics.x = horizontalPosition;


    }

    set accZ(newValue) {
        if (isNaN(newValue)){ // check for NaN
            newValue = 0;
        }
        //this._acc100Z = newValue;
        this._accZ = this.smoothedValueZ(newValue/100)
    }

    set accY(newValue) {
        if (isNaN(newValue)){ // check for NaN
            newValue = 0;
        }
        //this._acc100Y = newValue;
        this._accY = this.smoothedValueY(newValue/100)
    }

    smoothedValueZ(newValue){
        let now = new Date;
        let elapsedTime = now - this._lastUpdateZ;
        this._smoothedZ = this._smoothedZ + elapsedTime * (newValue - this._smoothedZ) / this._smoothing;
        this._lastUpdateZ = now;
        return this._smoothedZ;
    }

    smoothedValueY(newValue){
        let now = new Date;
        let elapsedTime = now - this._lastUpdateY;
        this._smoothedY = this._smoothedY + elapsedTime * (newValue - this._smoothedY) / this._smoothing;
        this._lastUpdateY = now;
        return this._smoothedY;
    }
}