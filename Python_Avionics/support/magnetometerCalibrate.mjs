'use strict';

import { Container, Graphics, TextStyle, Text, CanvasTextMetrics } from './pixi.mjs';

/*****************************************************************************
 * Class to display the magnetometer data for use in calibration
 */

export class MagnetometerCalibrate {

    constructor(app) {

        // save the display dimensions for use elsewhere in the function
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;
        this.app = app;

        this.scale = 1;
        this.max = 1;

        this.calibrationContainer = new Container();

        const dimBackgroundGraphics = this.createBackgroundGraphics();
        const axisContainer= this.createAxisContainer();
        
        this.calibrationContainer.addChild(dimBackgroundGraphics);
        this.calibrationContainer.addChild(axisContainer);

    }

    plotPoint(x,y,z) {
        this.xyGraphics.circle(x,y,1);
        this.xyGraphics.fill();
        this.xzGraphics.circle(x,z,1);
        this.xzGraphics.fill();
        this.yzGraphics.circle(y,z,1);
        this.yzGraphics.fill();
    }

    scalePoint(x,y,z) {

    }

    createBackgroundGraphics() {

        const backgroundGraphics = new Graphics();
        const clearBorder = 0;

        backgroundGraphics.fillStyle = {
            alpha: .80,          // 50%
            color: 0x000000,    // black
        };

        backgroundGraphics.strokeStyle = {
            alignment: 1,       // inside
            alpha: 1.0,         // solid
            color: 0x000000,    // black
            width: 1,           // 2 px
        };

        backgroundGraphics.rect(clearBorder,
                                clearBorder,
                                this.displayWidth - 2 * clearBorder,
                                this.displayHeight - 2 * clearBorder);

        backgroundGraphics.fill();
        //backgroundGraphics.stroke();

        return backgroundGraphics;
    }

    /*************************************************************************
     * @brief Create a container that has the 3D isometric axis and three
     *          'Graphic' objects, one for each plan to be used to plot
     *          the magnetic field data
     * 
     * @returns a 'Container' holding the various 'Graphics'
     */

    createAxisContainer() {

        const axisContainer = new Container();
        const magneticFieldStrengh = 65; // uTeslas

        // Determine if the axis will be scaled by the display height or the
        // display width

        var quarterHeight;
        var halfWidth;
        const root3 = Math.sqrt(3);

        // Calculate the initial sizing on the screen
        // cos(30) = root3 / 2
        // sin(30) =     1 / 2
        // tan(30) = 1 / root3


        // We want to create an isometric set of axis driven by either
        // the display width or height
        // Check if the display width or display height should drive graph
        // axis
        if (this.displayHeight / 2 > this.displayWidth / root3 ) {
            // base the display on the screen width as there is more 
            // height availalbe compared to the width we require
            quarterHeight = this.displayWidth / (2 * root3);
            halfWidth = this.displayWidth / 2;

        } else {
            // base the display on the screen height
            quarterHeight = this.displayHeight / 4;
            halfWidth = quarterHeight * root3;

        }

        // Centre the cointainer on the screen
        axisContainer.x = this.displayWidth / 2;
        axisContainer.y = 2 * quarterHeight;

        const axisGraphics = new Graphics();
        const clearBorder = 10;

        axisGraphics.fillStyle = {
            alpha: .80,          // 50%
            color: 0x000000,    // black
        };

        axisGraphics.strokeStyle = {
            alignment: .5,       // inside
            alpha: 1.0,         // solid
            color: 0xffffff,    // white
            width: 2,           // 2 px
        };

        axisGraphics.moveTo(0,0);
        axisGraphics.lineTo(0, -quarterHeight * 2);
        axisGraphics.moveTo(0,0);
        axisGraphics.lineTo(halfWidth, quarterHeight);
        axisGraphics.moveTo(0,0);
        axisGraphics.lineTo(-halfWidth, quarterHeight);

        axisGraphics.stroke();


        // Testing upper right graphics pan with skew
        this.xzGraphics = new Graphics();
        this.xzGraphics.x = halfWidth / 2;
        this.xzGraphics.y = - quarterHeight + halfWidth/2/root3;
        this.xzGraphics.skew.y = Math.PI / 6;
        this.xzGraphics.scale.x = (quarterHeight) / magneticFieldStrengh;
        this.xzGraphics.scale.y = (quarterHeight) / magneticFieldStrengh;

        this.xzGraphics.strokeStyle = {
            alignment: .5,
            alpha: 1.0,
            color: 0x00ffff,
            width: 1,
        };

        this.xzGraphics.circle(0,0,magneticFieldStrengh);

        this.xzGraphics.stroke();

        this.yzGraphics = new Graphics();
        this.yzGraphics.x = -halfWidth / 2;
        this.yzGraphics.y = - quarterHeight + halfWidth/2/root3;
        this.yzGraphics.skew.y = - Math.PI / 6;
        this.yzGraphics.scale.x = quarterHeight / magneticFieldStrengh;
        this.yzGraphics.scale.y = quarterHeight / magneticFieldStrengh;
        

        this.yzGraphics.strokeStyle = {
            alignment: .5,
            alpha: 1.0,
            color: 0x00ffff,
            width: 1,
        };

        this.yzGraphics.circle(0,0,magneticFieldStrengh);

        this.yzGraphics.stroke();

        this.xyGraphics = new Graphics();
        this.xyGraphics.x = 0
        this.xyGraphics.y = + quarterHeight; // + halfWidth/2/root3;
        this.xyGraphics.rotation = 2*Math.PI /6;
        this.xyGraphics.skew.y = - Math.PI / 6;
        this.xyGraphics.scale.x = quarterHeight / magneticFieldStrengh;
        this.xyGraphics.scale.y = quarterHeight / magneticFieldStrengh;

        this.xyGraphics.strokeStyle = {
            alignment: .5,
            alpha: 1.0,
            color: 0x00ffff,
            width: 1,
        };

        this.xyGraphics.circle(0,0,magneticFieldStrengh);

        this.xyGraphics.stroke();

        axisContainer.addChild(axisGraphics);
        axisContainer.addChild(this.xzGraphics);
        axisContainer.addChild(this.yzGraphics);
        axisContainer.addChild(this.xyGraphics);





        return axisContainer;
    }    

    addContainer() {
        //console.log(this.displayWidth);
        this.app.stage.addChild(this.calibrationContainer);
    }

    removeContainer() {
        this.app.stage.removeChild(this.calibrationContainer);
    }

}