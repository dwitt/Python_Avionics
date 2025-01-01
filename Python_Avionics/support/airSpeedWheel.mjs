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
export class AirspeedWheel  {

    constructor(app, x, y) {

        // Create wheel elements for the digits in the airspeed

        this.airspeedHundredsWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 2, false, 1, false, false, x, y);
       
        let airspeedTensWheelX = x + this.airspeedHundredsWheel.digitWidth;
        this.airspeedTensWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 1, false, 1, false, false, airspeedTensWheelX, y);

        let airspeedOnesWheelX = airspeedTensWheelX + this.airspeedTensWheel.digitWidth;
        this.airspeedOnesWheel = new NumericWheelDisplay("Tahoma", 37, 1489/2048, 30, 0, false, 1, false, false, airspeedOnesWheelX, y);

        let airspeedWidth = this.airspeedOnesWheel.digitWidth + this.airspeedTensWheel.digitWidth + this.airspeedHundredsWheel.digitWidth;

        this.airspeedWheelOutline(app, x ,y , airspeedWidth, 15);

        // Add text for kts
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

        this.IASunits = new Text("kts", this.style);
        this.IASunits.anchor.set(0,.2);
        this.IASunits.position.set(x + airspeedWidth + 8,y);

        app.stage.addChild(this.IASunits);
        app.stage.addChild(this.airspeedOnesWheel.digitContainer);
        app.stage.addChild(this.airspeedTensWheel.digitContainer);
        app.stage.addChild(this.airspeedHundredsWheel.digitContainer);

    }

    airspeedWheelOutline(app,x,y,width,height){
        let line = new Graphics();
        line.lineStyle(2,0xFFFFFF);
        line.beginFill(0x000000);
        // strart drawing the point
        line.moveTo(x-6,y);
        line.lineTo(x-1,y-5);
        // draw box
        line.lineTo(x-1,y-(1+height));
        line.lineTo(x+(1+width),y-(1+height));
        line.lineTo(x+(1+width),y+(1+height));
        line.lineTo(x-1,y+(1+height));
        // complete the point
        line.lineTo(x-1,y+5);
        line.lineTo(x-6,y);
        line.endFill();
    
        app.stage.addChild(line);
    
    }

    set value(newValue){
        this.airspeedOnesWheel.value = newValue;
        this.airspeedTensWheel.value = newValue;
        this.airspeedHundredsWheel.value = newValue;
    }

}
