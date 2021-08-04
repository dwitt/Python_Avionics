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

        // initial values for internal position variables
        this._pitch = 0;
        this._roll = 0;

        // get the size of the canvas used by the app
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;

        // the maximum number of degrees of pitch the can be seen on the diplay
        // in on direction either up or down
        let pitchDegrees = 35;

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

        // Draw a horizon separator line

        let lineWidth = 2.0;
        let lineColour = 0xFFFFFF;
        let lineAlpha = 1
        let lineAlignment = 0.5

        let horizonGraphics = new Graphics();
        horizonGraphics.lineStyle(lineWidth, lineColour, lineAlpha, lineAlignment);
        horizonGraphics.moveTo(-earthWidth/2,0);
        horizonGraphics.lineTo(earthWidth/2,0);
        
        // --------------------------------------------------------------------
        // create 10 and 20 degree lines
        // --------------------------------------------------------------------

        let length = this.displayWidth / 16;
        let halfLength = length / 2;
        let offset = 2; // Text offset from line in pixels

        let text_style = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 20,
            fill: "white",
            fontWeight: "normal",
            stroke: "black",
            strokeThickness: 3
            
        });




        let degreeGraphics = new Graphics();
        degreeGraphics.lineStyle(lineWidth, lineColour, lineAlpha, lineAlignment);
        for (let i=-20; i <= 20; i = i + 10) {
            let sign = Math.sign(i);

            if (i != 0) {

                let textLeft = new Text(String(Math.abs(i)), text_style);
                let textRight = new Text(String(Math.abs(i)), text_style);
                
                textLeft.anchor.set(1,0.5);
                textRight.anchor.set(0,0.5);

                textLeft.position.set(-length - offset,i * this.pitchRatio);
                textRight.position.set(length + offset,i * this.pitchRatio);
                
                degreeGraphics.addChild(textLeft);
                degreeGraphics.addChild(textRight);

            }


            degreeGraphics.moveTo(-halfLength,(i - sign * 5) * this.pitchRatio);
            degreeGraphics.lineTo(halfLength,(i - sign * 5) * this.pitchRatio);

            degreeGraphics.moveTo(-length,i * this.pitchRatio);    
            degreeGraphics.lineTo(length,i * this.pitchRatio);            

        }




        // Add the sky, earth and horizon to the pitch Container

        this.pitchContainer.addChild(skyGraphics);
        this.pitchContainer.addChild(earthGraphics);
        this.pitchContainer.addChild(horizonGraphics);
        this.pitchContainer.addChild(degreeGraphics);
         
        // Create a roll container

        this.rollContainer = new Container();

        // Add the pitch container

        this.rollContainer.addChild(this.pitchContainer);

        // Position the pitch container in the center of the window
        this.rollContainer.x = this.displayWidth / 2;
        this.rollContainer.y = this.displayHeight / 2;

        app.stage.addChild(this.rollContainer);
        this.bankArc(app);

    }
    /**
     * Setter for the pitch display
     */

    set pitch(newValue) {

        if (newValue == this._pitch) {

            return;
        }

        
        // the value should be a number of degrees and negative is up
        //console.log(newValue);
        this.pitchContainer.y = -newValue * this.pitchRatio;
        this._pitch = newValue;

    }

    set roll(newValue) {

        if (newValue == this._roll) {
            return;
        }

        //console.log(newValue);
        this.rollContainer.angle = -newValue;
        this._roll = newValue;
    }

    // ------------------------------------------------------------------------
    // --- Bank Angle Arc                                                   ---
    // ------------------------------------------------------------------------

    bankArc(app) {

        // Parameters
        let radius = 180;
        let start_radians = 7 / 6 * Math.PI;   // 210 deg
        let end_radians = 11 / 6 * Math.PI;    // 330 deg
        let major_length = 30;
        let minor_length = 15;

        // Tic mark locations measured in PI radians
        let major_marks = [7/6, 8/6, 10/6, 11/6];  
        let minor_marks = [5/4, 25/18, 26/18, 28/18, 29/18, 7/4];  

        let centreX = this.displayWidth / 2;
        let centreY = this.displayHeight / 2

        // Create the container to hold the arc
        let arcContainer = new Container();

        let x, y, angle, unit_x, unit_y, x1, y1;

        // Create the arc
        let arc = new Graphics();

        let lineWidth = 2
        let lineColour = 0xFFFFFF

        // Draw the are line
        arc.lineStyle(lineWidth,lineColour);
        arc.arc(0, 0, radius, start_radians, end_radians,false);

        // Draw the markings

        lineWidth = 3;
        
        arc.lineStyle(lineWidth,lineColour);
        for (let i = 0; i < major_marks.length; i = i + 1) {
            angle = 2 * Math.PI - major_marks[i] * Math.PI; 
            unit_x = Math.cos(angle);
            unit_y = Math.sin(angle);

            x = radius * unit_x;
            y = -radius * unit_y;
            x1 = (radius + major_length) * unit_x;
            y1 = -(radius + major_length) * unit_y;

            arc.moveTo(x,y);
            arc.lineTo(x1,y1);
        }

        lineWidth = 2;
        arc.lineStyle(lineWidth,lineColour);
        for (let i = 0; i < minor_marks.length; i = i + 1) {
            angle = 2 * Math.PI - minor_marks[i] * Math.PI; 
            unit_x = Math.cos(angle);
            unit_y = Math.sin(angle);

            x = radius * unit_x ;
            y = -radius * unit_y;
            x1 = (radius + minor_length) * unit_x;
            y1 = -(radius + minor_length) * unit_y;

            arc.moveTo(x,y);
            arc.lineTo(x1,y1);
        }

        arc.x = centreX;
        arc.y = centreY;
        // Save the are in the container and display it
        arcContainer.addChild(arc);
        app.stage.addChild(arcContainer);

    }
}