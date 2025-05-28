'use strict';

import { Container, Graphics, TextStyle, Text } from './pixi.mjs';

/*****************************************************************************
 * Class representing a Attitude indicator.
 *
 * This class will create an attitude indicator that is sized based on the 
 * canvas size of the app that is passed
 * 
 * 
 * 
 *****************************************************************************/
export class AttitudeIndicator {
    constructor(app) {

        this.app = app

        // initial values for internal position variables
        this._pitch = 0;
        this._roll = 0;

        // initial values for slip/skid acceleration and smoothing
        //this._acc100Z = 0;
        this._accZ = 0;
        //this._acc100Y = 0;
        this._accY = 0;
        this.slipSkidDegrees = 10;

        // parameters for smoothing
        this._smoothedZ = 0;
        this._smoothedY = 0;
        this._smoothing = 400;
        this._lastUpdateZ = new Date;
        this._lastUpdateY = new Date;

        // save the undefined states
        this._pitchUndefined = false;
        this._rollUndefined = false;

        // get the size of the canvas used by the app
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;

        // The maximum number of degrees of pitch the can be seen on the
        // display. Used to calculate the pitchRatio below.
        let pitchDegrees = 50;      // 25 degrees above and below the horizon

        // pitchRatio equal number of pixels per degree of pitch
        this.pitchRatio = (this.displayHeight) / pitchDegrees;

        // find the smallest display dimension and use it to determine the size 
        // of all arcs

        let circularBorder = 65;    // pixel border outside of arc
        let minimum_screen = Math.min(this.displayWidth, this.displayHeight);
        this.radius = (minimum_screen / 2 ) - circularBorder;

        this.triangleHeight = 25

        /********************************************************************* 
         * Create a container with the pitch grahpics background.
         * Pass in a mask for the pitch degree bars and labels.
         * The mask should be the diameter of the circle used for the roll
         * display.
         * The mask will be added to the to the Scene Graph later to that it is
         * a parent to pitch container. The pitch container needs it so that it
         * can be used as a mask for pitch lines and degree text.                                                      
         */

        // create the mask
        const pitchMaskGraphics = this.createAttitudeMaskGraphics();
        // create the pitch container
        this.pitchContainer = this.createAttitudeBackgroundContainer(pitchMaskGraphics);
        
        /*********************************************************************
         * Create a container that will rotate to display the roll of the 
         * aircraft. This container will be centered on the display but will 
         * rotate with the roll of the aircraft.
         * This container will have the pitch container as a child.
         */
        this.rollContainer = new Container();

        // add the pitch mask to the roll container here so that pitch changes
        // are masked so that only the center of the display shows the pitch
        // markings
        this.rollContainer.addChild(pitchMaskGraphics);

        // add the pitch container then add the mask so that it can be applied
        // to the pitch container
        this.rollContainer.addChild(this.pitchContainer);
   
        // add the bank arc container to the roll container
        this.rollContainer.addChild(this.createBankArcContainer(this.radius));

        // Position the roll container in the center of the window
        this.rollContainer.x = this.displayWidth / 2;
        this.rollContainer.y = this.displayHeight / 2;

        /*********************************************************************
         * Create the triangle graphic that represents the up direction of the
         * aircraft. This triangle will not move on the display. It will point
         * at the bank arc and show the bank angle of the aircraft.
         */
        this.triangleGraphics = this.createRollTriangleGraphics();

        /********************************************************************* 
         * Create a slip skid indicator below the roll triangle
         * This indicator needs to move back and forth
         */
        this.slipSkidGraphics = this.createSlipSkidGraphics();

        /*********************************************************************
         * Create a red X to be display when the attitude info is not valid 
         */
        this.badDataGraphics = this.createBadDataGraphics();

        // add the containers to the app stage
        app.stage.addChild(this.rollContainer);
        app.stage.addChild(this.triangleGraphics);
        app.stage.addChild(this.slipSkidGraphics);
        //app.stage.addChild(this.badDataGraphics);
    }

    /**
     * ***********************************************************************
     * Setter for the pitch display
     * @param {number | undefined} newValue
     */
    set pitch(newValue) {
        // check if value changed
        if (newValue == this._pitch) {
            return;
        }

        // check if new value undefined
        if (newValue === null && !this._pitchUndefined) {
            // new value just changed to undefined
            this._pitchUndefined = true
            this.app.stage.addChild(this.badDataGraphics);  
        } else if (newValue !== null && this._pitchUndefined ) {
            // new value just changed to defined
            this.app.stage.removeChild(this.badDataGraphics);
            this._pitchUndefined = false
        }

        // the value should be a number of degrees and negative is up
        //console.log(newValue);
        if (!this._pitchUndefined) {
            this.pitchContainer.y = newValue * this.pitchRatio;
            this._pitch = newValue;
        }

    }

    /**
     * ************************************************************************
     * Setter for the roll display
     * @param {number | undefined} newValue
     */
    set roll(newValue) {
        // check if value has changed
        if (newValue == this._roll) {
            return;
        }

        if (newValue === null && !this._rollUndefined) {
            // new value just changed to undefined
            this._rollUndefined = true
            this.app.stage.addChild(this.badDataGraphics);
        } else if (newValue !== null && this._rollUndefined){
            this.app.stage.removeChild(this.badDataGraphics );
            this._rollUndefined = false
        }
        if (newValue == this._roll) {
            return;
        }

        if (!this._rollUndefined) {
            this.rollContainer.angle = newValue;
            this._roll = newValue;
        }
    }

    /**
     * ************************************************************************
     * Setter for the acceleration in the Z direction
     * @param {number} newValue
     */
    set accZ(newValue) {
        if (isNaN(newValue)){ // check for NaN
            newValue = 0;
        }
        //this._acc100Z = newValue;
        this._accZ = this.smoothedValueZ(newValue/100)
    }

    /**
     * ************************************************************************
     * Setter for the acceleration in the Y direction
     * @param {number} newValue
     */
    // set accY(newValue) {
    //     if (isNaN(newValue)){ // check for NaN
    //         newValue = 0;
    //     }
    //     //this._acc100Y = newValue;
    //     this._accY = this.smoothedValueY(newValue/100)
    // }

    /************************************************************************* 
     * Create a container that holds the background for the attitude         *
     * indicator.                                                            *
     * Draw the sky and earth in a container where 0,0 is the center         *
     * Add the pitch lines and label them                                    *
    **************************************************************************/

    createAttitudeBackgroundContainer(pitchMaskGraphics){

        // --------------------------------------------------------------------
        // Calculate the various values we need to draw the pitch portion of 
        // the attitude indicator

        // calculate the width of sky and earth to ensure it fills display
        // when rolling. This should be the diagonal dimension of the display
        // ensure the display remains filled

        let skyWidth = Math.sqrt(Math.pow(this.displayWidth,2) 
                                + Math.pow(this.displayHeight,2));
        let earthWidth = skyWidth;

        // calculate the height of the sky and earth to accomodate 90 degrees 
        // plus enough additional pixels to prevent us from seeing black when 
        // rolling at a pitch angle of 90 degrees

        let skyHeight = this.pitchRatio * 90 + skyWidth/2
        let earthHeight = skyHeight;

        // --------------------------------------------------------------------
        // Create a container for the background
        let attitudeBackground = new Container(); 

        // define the background colours
        let skyColour = 0x0000C0;      // blue
        let earthColour = 0x884400;    // brown
        let lineColour = 0xFFFFFF;     // white 

        // create the sky graphics 
        let skyGraphics = new Graphics();
        skyGraphics.rect(-skyWidth/2, -skyHeight, skyWidth, skyHeight);
        skyGraphics.fill(skyColour);

        // create the earth graphics
        let earthGraphics = new Graphics();
        earthGraphics.rect(-earthWidth/2, 0, earthWidth, earthHeight);
        earthGraphics.fill(earthColour);

        // Draw a horizon separator line
        let lineWidth = 1.0;
        let lineAlpha = 1;
        let lineAlignment = 0.5;

        let horizonGraphics = new Graphics();
        horizonGraphics.strokeStyle = {
            alignment: lineAlignment,
            alpha: lineAlpha,
            color: lineColour,
            width: lineWidth
        };
        horizonGraphics.moveTo(-earthWidth/2,0);
        horizonGraphics.lineTo(earthWidth/2,0);
        horizonGraphics.stroke();

        // create the 5 and 10 degree of pitch lines
        // and label them
        let length = this.displayWidth / 16;
        let halfLength = length / 2;
        let offset = 2; // Text offset from line in pixels

        let text_style = new TextStyle({
            fontFamily: "Tahoma",
            fontSize: 20,
            fill: "white",
            fontWeight: "normal",
            stroke: {
                color: "black",
                width: 3,
            }//,
            //strokeThickness: 2  
        });

        let degreeContainer = new Container;
        let degreeGraphics = new Graphics(); // Container for attidude degrees

        lineWidth = 2.0;

        degreeGraphics.strokeStyle = {
            width: lineWidth,
            color: lineColour, 
            alpha: lineAlpha,
            alignment: lineAlignment
        };

        for (let i=-110; i <= 110; i = i + 10) {
            let sign = Math.sign(i);
            let absDeg = Math.abs(i);
            let deg = 0
            if (absDeg > 90) {
                deg = String(-1 * sign * (90 - (absDeg - 90)));
            } else {
                deg = String(-i);
            }


            if (i != 0) {

                const textLeft = new Text({
                    text: deg,
                    style: text_style
                });
                const textRight = new Text({
                    text: deg, 
                    style: text_style
                });
                
                textLeft.anchor.set(1, 0.55);
                textRight.anchor.set(0,0.55);

                textLeft.position.set(-length - offset,i * this.pitchRatio);
                textRight.position.set(length + offset,i * this.pitchRatio);
                
                degreeContainer.addChild(textLeft);
                degreeContainer.addChild(textRight);

                degreeGraphics.moveTo(-halfLength,(i - sign * 5) * this.pitchRatio);
                degreeGraphics.lineTo(halfLength,(i - sign * 5) * this.pitchRatio);
                degreeGraphics.stroke();

                degreeGraphics.moveTo(-length,i * this.pitchRatio);    
                degreeGraphics.lineTo(length,i * this.pitchRatio);    
                degreeGraphics.stroke();        
            }
        }

        degreeGraphics.mask = pitchMaskGraphics;
        degreeContainer.mask = pitchMaskGraphics;

        attitudeBackground.addChild(skyGraphics);
        attitudeBackground.addChild(earthGraphics);
        attitudeBackground.addChild(horizonGraphics);
        attitudeBackground.addChild(degreeGraphics); // attitude degrees
        attitudeBackground.addChild(degreeContainer);

        return attitudeBackground;
    }
    /*************************************************************************
     * Create a mask for the degreeGraphics of the attitude indicator         *
     *************************************************************************/

    createAttitudeMaskGraphics() {
        let maskGraphics = new Graphics();
        let fillColour = 0xFF0000;          // red
        maskGraphics.fillStyle = {
            color: fillColour,
        }
        maskGraphics.circle(0,0, this.radius);
        maskGraphics.fill();
        return maskGraphics;
    }

    /*************************************************************************
     * Draw the Roll triangle for the Arc                                    *
     * This is the fixed triangle point up to the roll arc                   *
     *************************************************************************/

    createRollTriangleGraphics(){

        let triangleHeight = 25;

        let lineWidth = 2;
        let lineColour = 0x000000; // black
        let fillColour = 0xFFFF00; // Yellow

        let triangleGraphics = new Graphics(); // Container for triangle

        triangleGraphics.strokeStyle = {
            alignment: 1,
            alpha: 1,
            cap: "round",
            color: lineColour,
            width: lineWidth,   
        }

        triangleGraphics.fillStyle = {
            alpha: 1,
            color: fillColour,
        }

        const path = [
            0, -this.radius, 
            triangleHeight/2, triangleHeight-this.radius,
            -triangleHeight/2, triangleHeight-this.radius
        ];
        triangleGraphics.poly(path);
        triangleGraphics.fill(); 
        triangleGraphics.stroke();


        triangleGraphics.x = this.displayWidth/2;
        triangleGraphics.y = this.displayHeight/2;

        return triangleGraphics;
    }










    /**
     * set a new value for acceleration in the y direction (slip / skid)
     * @param {number} newValue
     */
    set accY(newValue) {
        // check for NaN in order to protect the smoothing calculation
        if (isNaN(newValue)){ // check for NaN
            newValue = 0;
        }
        this._acc100 = newValue;
        this._smooth = this.smoothedValueY(newValue/100);

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

    updateSlipSkid() {
        // caluclate effective angle of slip or skid

        // let angle = Math.asin(this._acc/9.81) * 180 / Math.PI;
        let angle = Math.atan(this._accY / this._accZ) * 180 / Math.PI;
        let sign = Math.sign(angle);

        let horizontalPosition = Math.min(Math.abs(angle),this.slipSkidDegrees) * sign * this.triangleHeight / this.slipSkidDegrees;
        this.slipSkidGraphics.x = horizontalPosition + this.displayWidth / 2;


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

    /*************************************************************************
     * Create the Bank Arc Container                                         *
     *************************************************************************/

    createBankArcContainer(radius) {

        // Parameters
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
        let arcGraphics = new Graphics();

        let lineWidth = 2
        let lineColour = 0xFFFFFF

        // Draw the Arc line
        arcGraphics.strokeStyle = {
            width: lineWidth,
            color: lineColour
        };
        arcGraphics.arc(0, 0, radius, start_radians, end_radians,false);
        arcGraphics.stroke();

        // Draw the Arc tick markings

        lineWidth = 3;
        
        // Major Tick marks (-60, -30, 30 ,60)
        arcGraphics.strokeStyle = {
            width: lineWidth,
            color: lineColour
        }

        for (let i = 0; i < major_marks.length; i = i + 1) {
            angle = 2 * Math.PI - major_marks[i] * Math.PI; 
            unit_x = Math.cos(angle);
            unit_y = Math.sin(angle);

            x = radius * unit_x;
            y = -radius * unit_y;
            x1 = (radius + major_length) * unit_x;
            y1 = -(radius + major_length) * unit_y;

            arcGraphics.moveTo(x,y);
            arcGraphics.lineTo(x1,y1);
            arcGraphics.stroke();
        }

        // Minor Tick marks (-45, -20, -10, 10, 20, 45)
        lineWidth = 2;
        arcGraphics.strokeStyle = {
            width: lineWidth,
            color: lineColour
        };

        for (let i = 0; i < minor_marks.length; i = i + 1) {
            angle = 2 * Math.PI - minor_marks[i] * Math.PI; 
            unit_x = Math.cos(angle);
            unit_y = Math.sin(angle);

            x = radius * unit_x ;
            y = -radius * unit_y;
            x1 = (radius + minor_length) * unit_x;
            y1 = -(radius + minor_length) * unit_y;

            arcGraphics.moveTo(x,y);
            arcGraphics.lineTo(x1,y1);
            arcGraphics.stroke();
        }

        // Draw the 0 degree roll triangle

        let fillColour = 0xFFFFFF; 

        arcGraphics.strokeStyle = {
            width: 2,
            color: 0xFFFFFF,
            alpha: 1,
            alignment: 1,
            cap: "round",
        }

        arcGraphics.fillStyle = {
            color: fillColour,
            alpha: 1,
        }

        const path = [
            0, -this.radius, 
            triangleHeight/2, -triangleHeight-this.radius, 
            -triangleHeight/2, -triangleHeight-this.radius
        ];
        arcGraphics.poly(path);
        //arcGraphics.stroke();
        arcGraphics.fill();

        arcGraphics.x = centreX;
        arcGraphics.y = centreY;

        // Save the are in the container and display it
        arcContainer.addChild(arcGraphics);
        return arcContainer;

    }

    /********************************************************************* 
     * Draw a slip skid indicator below the roll triangle                *
     * This indicator needs to move back and forth                       *
     *********************************************************************/

    createSlipSkidGraphics(){

        let slipSkidGraphics = new Graphics(); // Container for indicator
        
        let topPercent = 1.05;
        let bottomPercent = 1.3;

        let lineColour = 0x000000;
        let lineWidth = 2;
        let fillColour = 0xffff00;

        slipSkidGraphics.strokeStyle = {
            alignment: 1,       // inside
            alpha: 1,
            cap: "round",
            color: lineColour,
            width: lineWidth,   
        }

        slipSkidGraphics.fillStyle = {
            alpha: 1,
            color: fillColour,
        }

        let path = [
            -topPercent * this.triangleHeight/2, -this.radius + topPercent * this.triangleHeight,
            topPercent * this.triangleHeight/2, -this.radius + topPercent * this.triangleHeight,
            bottomPercent * this.triangleHeight/2, -this.radius + bottomPercent * this.triangleHeight,
            -bottomPercent * this.triangleHeight/2, -this.radius + bottomPercent * this.triangleHeight 
        ];

        slipSkidGraphics.poly(path);
        slipSkidGraphics.fill();
        slipSkidGraphics.stroke();


        // position the graphic based on the display centre
        slipSkidGraphics.x = this.displayWidth/2;
        slipSkidGraphics.y = this.displayHeight/2;

        return slipSkidGraphics;
    }

    /*************************************************************************
     * Draw a Red X for when the indicater is invalid                        *
     *************************************************************************/

    createBadDataGraphics() {
        const badDataGraphics = new Graphics();

        const lineWidth = 2;
        const lineColour = 0xFF0000; // Red

        badDataGraphics.strokeStyle = {
            width: lineWidth,
            color: lineColour,
        }

        badDataGraphics.moveTo(this.radius,this.radius);
        badDataGraphics.lineTo(-this.radius, -this.radius);
        badDataGraphics.moveTo(this.radius, -this.radius);
        badDataGraphics.lineTo(-this.radius, this.radius);
        badDataGraphics.stroke();

        badDataGraphics.x = this.displayWidth/2;
        badDataGraphics.y = this.displayHeight/2;

        return badDataGraphics;
    }
}