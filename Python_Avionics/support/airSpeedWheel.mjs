// 1-June-2025 - Updated for PixiJS 8.6.6
'use strict';

import { NumericWheelDisplay } from "./numericWheelDisplay.mjs";
import { Graphics, TextStyle, Text} from './pixi.mjs';

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
        this.style = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: "white",
            fontWeight: "normal",
            stroke: {
                color: "black",
                width: 2,
                }
            }
        );

        this.IASunits = new Text({
            text: "kts",
            style: this.style
            });
        this.IASunits.anchor.set(0,.2);
        this.IASunits.position.set(x + airspeedWidth + 8,y);

        app.stage.addChild(this.IASunits);
        app.stage.addChild(this.airspeedOnesWheel.digitContainer);
        app.stage.addChild(this.airspeedTensWheel.digitContainer);
        app.stage.addChild(this.airspeedHundredsWheel.digitContainer);

    }

    airspeedWheelOutline(app,x,y,width,height){
        let line = new Graphics();

        line.strokeStyle = {
            color: 0xffffff,    // white
            width: 2,           // 2 px
        };

        line.fillStyle = {
            color: 0x000000,    // black
        };

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
  
        line.closePath();

        line.stroke();
        line.fill();
    
        app.stage.addChild(line);
    
    }

    set value(newValue){
        this.airspeedOnesWheel.value = newValue;
        this.airspeedTensWheel.value = newValue;
        this.airspeedHundredsWheel.value = newValue;
    }

}
