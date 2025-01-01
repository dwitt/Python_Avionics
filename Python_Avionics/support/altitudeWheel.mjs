/* global PIXI */
'use strict';

import { NumericWheelDisplay } from "./numericWheelDisplay.mjs";

// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
// var Graphics = PIXI.Graphics,
//     Text = PIXI.Text;

/**     
 * Class representing an Airspeed Wheel Display.
 */
export class AltitudeWheel  {

    constructor(app) {

        // position based on screen size
        this.x = app.screen.width - 45;
        this.y = app.screen.height / 2;
        this.app = app;

        //console.log("construct alt tens");
        this.tensWheel = new NumericWheelDisplay("Tahoma", 28, 1489/2048, 30, 1 ,false, 20, true, true, this.x, this.y);

        let hundredsWheelX = this.x - this.tensWheel.digitWidth;
        this.hundredsWheel = new NumericWheelDisplay("Tahoma", 28, 1489/2048, 30, 2, false, 1, true, true, hundredsWheelX, this.y);

        let thousandsWheelX = hundredsWheelX - this.hundredsWheel.digitWidth;
        this.thousandsWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 3, false, 1, true, true, thousandsWheelX, this.y);

        let tenThousandsWheelX = thousandsWheelX - this.thousandsWheel.digitWidth;
        this.tenThousandsWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 4, true, 1, true, true, tenThousandsWheelX, this.y);

        let width = this.tensWheel.digitWidth + this.hundredsWheel.digitWidth + this.thousandsWheel.digitWidth + this.tenThousandsWheel.digitWidth;
        let width1 = this.tensWheel.digitWidth;

        this.altitudeWheelOutline(app, this.x, this.y, true, width, 30/2 , width1, (30/2 + 20) );

        // Add text for ft
        // Create a style to be used for the units characters
        this.style = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: "white",
            fontWeight: "normal",
            stroke: "black",
            strokeThickness: 2
            }
        );

        this.altUnits = new Text("ft", this.style);
        this.altUnits.anchor.set(1,0.2);
        this.altUnits.position.set((this.x - width) - 5, this.y);

        this.app.stage.addChild(this.altUnits);
        this.app.stage.addChild(this.tensWheel.digitContainer);
        this.app.stage.addChild(this.hundredsWheel.digitContainer);
        this.app.stage.addChild(this.thousandsWheel.digitContainer);
        this.app.stage.addChild(this.tenThousandsWheel.digitContainer);
    }

    altitudeWheelOutline(app,x,y,right,width,height,left_width,left_height){
        let line = new Graphics();
        line.lineStyle(2,0xFFFFFF);
        line.beginFill(0x000000);
        // strart drawing the point
        line.moveTo(x+6,y);
        line.lineTo(x+1,y-5);
        // draw right side box
        line.lineTo(x+1,y-(1+left_height));
        line.lineTo(x-(1+left_width),y-(1+left_height));
        line.lineTo(x-(1+left_width),y-(1+height));
        // draw left side box
        line.lineTo(x-(1+width),y-(1+height));
        line.lineTo(x-(1+width),y+(2+height));
        line.lineTo(x-(1+left_width),y+(2+height));
        // draw right side box
        line.lineTo(x-(1+left_width),y+(1+left_height));
        line.lineTo(x+1,y+(1+left_height));
        // complete the point
        line.lineTo(x+1,y+5);
        line.lineTo(x+6,y);
        line.endFill();

        app.stage.addChild(line);

    }

    set value(newValue) {
        this.tensWheel.value = newValue;
        this.hundredsWheel.value = newValue;
        this.thousandsWheel.value = newValue;
        this.tenThousandsWheel.value = newValue;
    }
}