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
 * Class representing a Attitude indicator.
 */
export class AttitudeIndicator {
    constructor(app) {
        this._pitch = 0;
        this._roll = 0;
        // get the size of the canvas used by the app
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;

        // the maximum number of degrees of pitch the can be seen on the diplay
        // in on direction either up or down
        let pitchDegrees = 30;

        // calculated attitude sky and earth total height based on 90 degrees
        // available up or down
        // add pitchDegrees to this to allow for the display to be filled at 
        // the extremes of pitch

        // pitchRatio equal number of pixels per degree of pitch
        this.pitchRatio = (this.displayHeight / 2) / pitchDegrees;

        let skyHeight = (this.displayHeight / 2) / pitchDegrees * (90 + pitchDegrees);
        let earthHeight = skyHeight;

        // calculate the width of sky and earth to ensure it fills display
        // when rolling

        let skyWidth = Math.sqrt(Math.pow(this.displayWidth,2) + Math.pow(this.displayHeight,2));
        let earthWidth = skyWidth;

        // Draw the sky and earth in a container where 0,0 is the center

        this.pitchContainer = new Container();

        let skyColour = 0x0000C0;

        let skyGraphics = new Graphics();
        skyGraphics.beginFill(skyColour);
        skyGraphics.drawRect(-skyWidth/2, -skyHeight, skyWidth, skyHeight);
        skyGraphics.endFill();

        let earthColour = 0x884400;

        let earthGraphics = new Graphics();
        earthGraphics.beginFill(earthColour);
        earthGraphics.drawRect(-earthWidth/2, 0, earthWidth, earthHeight);
        earthGraphics.endFill();

        // Add the sky and earth to the pitch Container

        this.pitchContainer.addChild(skyGraphics);
        this.pitchContainer.addChild(earthGraphics);
         
        // Create a roll container

        this.rollContainer = new Container();

        // Add the pitch container

        this.rollContainer.addChild(this.pitchContainer);

        // Position the pitch container in the center of the window
        this.rollContainer.x = this.displayWidth / 2;
        this.rollContainer.y = this.displayHeight / 2;

        app.stage.addChild(this.rollContainer);

    }
    /**
     * Setter for the pitch display
     */

    set pitch(newValue) {

        if (newValue == this._pitch) {

            return;
        }

        
        // the value should be a number of degrees and negative is up
        console.log(newValue);
        this.pitchContainer.y = -newValue * this.pitchRatio;
        this._pitch = newValue;

    }

    set roll(newValue) {

        if (newValue == this._roll) {
            return;
        }

        console.log(newValue);
        this.rollContainer.angle = -newValue;
        this._roll = newValue;
    }
}