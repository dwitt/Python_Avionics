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

/******************************************************************************
 * Class representing a Attitude indicator.
 */
export class AttitudeIndicator {
    constructor(app) {

        // initial values for internal position variables
        this._pitch = 0;
        this._roll = 0;

        // initial values for slip/skid acc and smoothing
        this._acc100 = 0;
        this._acc = 0;
        this._smooth = 0;
        this.slipSkidDegrees = 20;

        // parameters for smoothing
        this._smoothed = 0;
        this._smoothing = 400;
        this.lastUpdate = new Date;

        // get the size of the canvas used by the app
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;

        // the maximum number of degrees of pitch the can be seen on the display
        // in on direction either up or down
        let pitchDegrees = 25;

        // calculated attitude sky and earth total height based on 90 degrees
        // available up or down
        // add pitchDegrees to this to allow for the display to be filled at 
        // the extremes of pitch

        // pitchRatio equal number of pixels per degree of pitch
        // TODO: base this on a square that is the minimum of either the
        //          displayHeight and displayWidth
        //          OR maybe not if the app screen is sized correctly
        this.pitchRatio = (this.displayHeight / 2) / pitchDegrees;

        // calculate the width of sky and earth to ensure it fills display
        // when rolling

        let skyWidth = Math.sqrt(Math.pow(this.displayWidth,2) + Math.pow(this.displayHeight,2));
        let earthWidth = skyWidth;

        // calculate the height of the sky and earth to accomodate 90 degrees plus
        // enough additional pixels to prevent us from seeing black when rolling 
        // at a pitch angle of 90 degrees

        let skyHeight = ((this.displayHeight / 2) / pitchDegrees * (90)) + skyWidth/2;
        let earthHeight = skyHeight;

        // find the smallest screen dimension and use it to determine the size 
        // of all arcs

        let minimum_screen = Math.min(app.screen.width, app.screen.height);

        let radius = (minimum_screen / 2 ) - 68;         // duplicated in the drawing of the BankArc

        /********************************************************************* 
         * Draw the sky and earth in a container where 0,0 is the center     *
         *********************************************************************/
        this.pitchContainer = new Container(); // Container for sky and earth

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
        
        //********************************************************************/

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
            strokeThickness: 2
            
        });


        let degreeGraphics = new Graphics(); // Container for attidude degrees

        degreeGraphics.lineStyle(lineWidth, lineColour, lineAlpha, lineAlignment);
        for (let i=-90; i <= 90; i = i + 10) {
            let sign = Math.sign(i);
            let deg = String(sign * -Math.abs(i));

            if (i != 0) {

                let textLeft = new Text(deg, text_style);
                let textRight = new Text(deg, text_style);
                
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

        /*********************************************************************
         * Create a mask for the degreeGraphics of the attitude indicator    *
         *********************************************************************/
 

        let maskGraphics = new Graphics();

        let fillColour = 0xFF0000;
        maskGraphics.beginFill(fillColour);
        maskGraphics.drawCircle(0,0,radius-10);

        degreeGraphics.mask = maskGraphics;






        // Add the sky, earth and horizon to the pitch Container

        this.pitchContainer.addChild(skyGraphics);
        this.pitchContainer.addChild(earthGraphics);
        this.pitchContainer.addChild(horizonGraphics);
        this.pitchContainer.addChild(degreeGraphics); // attitude degrees
        // TODO: move the mask for the degreeGraphics up here
        
        // --------------------------------------------------------------------
        // Create a roll container
        // --------------------------------------------------------------------

        this.rollContainer = new Container();
        
        /*********************************************************************
         * Draw the Roll triangle for the Arc                                *
         * This is the fixed triangle point up to the roll arc               *
         *********************************************************************/


        this.triangleHeight = 25;

        lineWidth = 2;
        lineColour = 0x000000;
        fillColour = 0xFFFF00; // Yellow

        let lineOptions = new Object;
        lineOptions.width = 1;
        lineOptions.color = 0x000000;
        lineOptions.alpha = 1;
        lineOptions.alignment = 0;
        lineOptions.cap = PIXI.LINE_CAP.ROUND;

        let triangleGraphics = new Graphics(); // Container for triangle

        triangleGraphics.lineStyle(lineOptions);
        
        triangleGraphics.beginFill(fillColour, 1);
        triangleGraphics.drawPolygon(0,-radius, this.triangleHeight/2, this.triangleHeight-radius, -this.triangleHeight/2, this.triangleHeight-radius);
        triangleGraphics.endFill();

        triangleGraphics.x = this.displayWidth/2;
        triangleGraphics.y = this.displayHeight/2;

        /********************************************************************* 
         * Draw a slip skid indicator below the roll triangle                *
         * This indicator needs to move back and forth                       *
         *********************************************************************/

        this.slipSkidGraphics = new Graphics(); // Container for indicator
        let topPercent = 1.05;
        let bottomPercent = 1.3;

        this.slipSkidGraphics.lineStyle(lineOptions);

        this.slipSkidGraphics.beginFill(fillColour, 1);
        this.slipSkidGraphics.drawPolygon(
            -topPercent * this.triangleHeight/2, -radius + topPercent * this.triangleHeight,
            topPercent * this.triangleHeight/2, -radius + topPercent * this.triangleHeight,
            bottomPercent * this.triangleHeight/2, -radius + bottomPercent * this.triangleHeight,
            -bottomPercent * this.triangleHeight/2, -radius + bottomPercent * this.triangleHeight 
        );
        this.slipSkidGraphics.endFill;

        // position the graphic based on the display centre
        this.slipSkidGraphics.x = this.displayWidth/2;
        this.slipSkidGraphics.y = this.displayHeight/2;

        // Add the pitch container

        this.rollContainer.addChild(this.pitchContainer);
        this.rollContainer.addChild(maskGraphics);

        this.rollContainer.addChild(this.bankArc(radius));

        // Position the pitch container in the center of the window
        this.rollContainer.x = this.displayWidth / 2;
        this.rollContainer.y = this.displayHeight / 2;

        // add the rollContainer to the stage as a child
        app.stage.addChild(this.rollContainer);

        app.stage.addChild(triangleGraphics);
        app.stage.addChild(this.slipSkidGraphics);

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

    /**
     * set a new value for acceleration in the y direction (slip / skid)
     */

    set accy(newValue) {
        // check for NaN in order to protect the smoothing calculation
        if (isNaN(newValue)){ // check for NaN
            newValue = 0;
        }
        this._acc100 = newValue;
        this._smooth = this.smoothedValue(newValue/100);

        if (this._smooth == this._acc) {
            return;
        }
        this._acc = this._smooth;

        // caluclate effective angle of slip or skid
        let angle = Math.asin(this._acc/9.81) * 180 / Math.PI;
        let sign = Math.sign(angle);

        let horizontalPosition = Math.min(Math.abs(angle),this.slipSkidDegrees) * sign * this.triangleHeight / this.slipSkidDegrees;
        this.slipSkidGraphics.x = horizontalPosition + this.displayWidth / 2;


    }

    smoothedValue(newValue){
        let now = new Date;
        let elapsedTime = now - this.lastUpdate;
        this._smoothed = this._smoothed +  elapsedTime * (newValue - this._smoothed) / this._smoothing;
        this.lastUpdate = now;
        return this._smoothed;
    }

    /**
     * Create the Bank Arc
     */

    bankArc(radius) {

        // Parameters
        //let radius = 180;
        let triangleHeight = 20; // This is a duplicate from the main class - fix

        let start_radians = 7 / 6 * Math.PI;   // 210 deg
        let end_radians = 11 / 6 * Math.PI;    // 330 deg
        let major_length = radius / 6;
        let minor_length = radius / 12;

        // Tic mark locations measured in PI radians
        let major_marks = [7/6, 8/6, 10/6, 11/6];  
        let minor_marks = [5/4, 25/18, 26/18, 28/18, 29/18, 7/4];  

        let centreX = 0; //this.displayWidth / 2;
        let centreY = 0; //this.displayHeight / 2

        /** Pixi.js Container to hold the arc */
        let arcContainer = new Container();

        let x, y, angle, unit_x, unit_y, x1, y1;

        /** Graphics for the arc */
        let arc = new Graphics();

        let lineWidth = 2
        let lineColour = 0xFFFFFF

        // Draw the Arc line
        arc.lineStyle(lineWidth,lineColour);
        arc.arc(0, 0, radius, start_radians, end_radians,false);

        // Draw the Arc tick markings

        lineWidth = 3;
        
        // Major Tick marks (-60, -30, 30 ,60)
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

        // Minor Tick marks (-45, -20, -10, 10, 20, 45)
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

        // Draw the 0 degree roll triangle

        let fillColour = 0xFFFFFF;

        let lineOptions = new Object;
        lineOptions.width = 0;
        lineOptions.color = 0x000000;
        lineOptions.alpha = 1;
        lineOptions.alignment = 0;
        lineOptions.cap = PIXI.LINE_CAP.ROUND;

        let triangleGraphics = new Graphics();

        arc.lineStyle(lineOptions);
        
        arc.beginFill(fillColour, 1);
        arc.drawPolygon(0,-radius, triangleHeight/2, -triangleHeight-radius, -triangleHeight/2, -triangleHeight-radius);
        arc.endFill();


        arc.x = centreX;
        arc.y = centreY;
        // Save the are in the container and display it
        arcContainer.addChild(arc);
        return arcContainer;

    }
}