'use strict';

import { Container, Graphics } from './pixi.mjs';

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
        this._lastUpdateY = new Date;

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

        // Tube dimensions
        let tubeLeft = -this.indicatorSize * this.ballDiameter - this.ballDiameter/2 - 2;
        let tubeTop = -this.ballDiameter/2 - 2;
        let tubeWidth = 2 * this.indicatorSize * this.ballDiameter + this.ballDiameter + 4;
        let tubeHeight = this.ballDiameter + 4;
        let tubeRadius = this.ballDiameter/2 + 2;

        // Fill the tube background
        slipBallBackgroundGraphics.roundRect(tubeLeft, tubeTop, tubeWidth, tubeHeight, tubeRadius);
        slipBallBackgroundGraphics.fill({ color: bgColour, alpha: bgAlpha });

        // Shadow edge on top (recessed look)
        let tubeEdges = new Graphics();
        tubeEdges.roundRect(tubeLeft, tubeTop, tubeWidth, tubeHeight, tubeRadius);
        tubeEdges.stroke({ width: 2, color: 0x333333 });  // was 1.5

        // Inner highlight along the bottom (light catching lower edge)
        let tubeHighlight = new Graphics();
        tubeHighlight.roundRect(tubeLeft + 1, tubeTop + 1, tubeWidth - 2, tubeHeight - 2, tubeRadius - 1);
        tubeHighlight.stroke({ width: 1, color: 0x444444 });
        


        // Add the tube graphics to the container (outer edge, fill, inner highlight)
        slipBallContainer.addChild(slipBallBackgroundGraphics);
        slipBallContainer.addChild(tubeEdges);
        slipBallContainer.addChild(tubeHighlight);

        // position the container
        slipBallContainer.x = displayWidth / 2;
        slipBallContainer.y = displayHeight - positionFromBottom;

        // Create the slip ball
        this.slipBallGraphics = new Container();
        let radius = this.ballDiameter / 2;

        // Base ball - light grey, no outline (arcs provide the edge)
        let ballBase = new Graphics();
        ballBase.circle(0, 0, radius);
        ballBase.fill({ color: 0xCCCCCC });
        this.slipBallGraphics.addChild(ballBase);

        // Shadow arc on bottom-right (light coming from upper-left)
        let shadowArc = new Graphics();
        shadowArc.arc(0, 0, radius, Math.PI * 0.15, Math.PI * 1.15);
        shadowArc.stroke({ width: 2, color: 0x444444 });
        this.slipBallGraphics.addChild(shadowArc);

        // Highlight arc on top-left
        let highlightArc = new Graphics();
        highlightArc.arc(0, 0, radius, Math.PI * 1.15, Math.PI * 0.15);
        highlightArc.stroke({ width: 1.5, color: 0x999999 });
        this.slipBallGraphics.addChild(highlightArc);

        // Shadow on bottom-right - darker grey, offset
        let ballShadow = new Graphics();
        ballShadow.circle(1, 2, radius - 3);
        ballShadow.fill({ color: 0x999999, alpha: 0.5 });
        this.slipBallGraphics.addChild(ballShadow);

        // Highlight on upper-left - white, smaller and offset
        let ballHighlight = new Graphics();
        ballHighlight.circle(-3, -3, radius * 0.4);
        ballHighlight.fill({ color: 0xFFFFFF, alpha: 0.7 });
        this.slipBallGraphics.addChild(ballHighlight);

        slipBallContainer.addChild(this.slipBallGraphics);

        // Inclinometer bars (added after ball so they render in front)
        let slipBallBarGraphics = new Graphics();
        slipBallBarGraphics.strokeStyle = {
            width: 2,
            color: 0xFFFFFF,
        };

        slipBallBarGraphics.moveTo( -this.ballDiameter/2 - 1, -this.ballDiameter/2 - 1);
        slipBallBarGraphics.lineTo( -this.ballDiameter/2 - 1, +this.ballDiameter/2 + 1);
        slipBallBarGraphics.stroke();

        slipBallBarGraphics.moveTo( this.ballDiameter/2 + 1, -this.ballDiameter/2 - 1);
        slipBallBarGraphics.lineTo( this.ballDiameter/2 + 1, +this.ballDiameter/2 + 1);
        slipBallBarGraphics.stroke();

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