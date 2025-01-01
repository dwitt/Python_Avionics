'use strict';
/* global PIXI */
import { drawSpecialRectangle } from './specialRectangle.mjs';
// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
// var Application = PIXI.Application,
//     loader = PIXI.Loader.shared,
//     resources = PIXI.Loader.shared.resources,
//     TextureCache = PIXI.utils.TextureCache,
//     Sprite = PIXI.Sprite,
//     Rectangle = PIXI.Rectangle,
// var Graphics = PIXI.Graphics,
//     Container = PIXI.Container,
//     Text = PIXI.Text;

/**     
 * Class representing the speed display.
 * 
 * 
 */


 const GS = 0;
 const TAS = 1;

// Used for calibrated airspeed (*** This calculation is not currently used ***)
const GAMMA = 1.401;                // ratio of specific heats of air
// SEA_LEVEL_PRESSURE_ISA = 101325     // Pa
// SEA_LEVEL_DENSITY_ISA = 1.225       // Kg / ( m * s^2 )
// MULTIPLIER = ((2 * GAMMA) / (GAMMA - 1) *
//             (float(SEA_LEVEL_PRESSURE_ISA) / SEA_LEVEL_DENSITY_ISA))
// EXPONENT = ( GAMMA - 1 ) / GAMMA
// CONVERT_MPS_TO_KNOTS = 1.943844


export class SpeedDisplay {




    constructor (app, x , y, width, height, radius){

        this.screen_width = app.screen.width;
        this.selected = false;
        this.changable = false;
        this.changeableFirstPass = false;

        this.groundSpeedValue = 0;
        this.trueAirSpeedValue = 0;
        this.staticPressureValue = 0;
        this.differentialPressureValue = 0;
        this.outsideAirTemperatureValue = 0;
        this.mach = 0;
        this.speedOfSound = 0;

        this.container = new Container();
        this.colour = "chartreuse";

        this.displayItem = GS;
    
        // Create a style to be used for the speed characters
        this.style = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: this.colour,
            fontWeight: "normal"
        });

        this.unitsStyle = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '12px',
            fill: this.colour,
            fontWeight: "normal"
        });
    

        let valueText = "0"
        let legendText = "GS"
        let unitsText = "kts" 
    
        this.speedText = new Text(valueText, this.style);
        this.speedText.anchor.set(1,.5);
        this.speedText.position.set(x + width*2/3 , y - height/2);

        this.speedLegend = new Text(legendText, this.unitsStyle);
        this.speedLegend.anchor.set(0,.87);
        this.speedLegend.position.set(x + width * 2/3 + 5, y - height / 2);

        this.speedUnits = new Text(unitsText, this.unitsStyle);
        this.speedUnits.anchor.set(0,.17);
        this.speedUnits.position.set(x + width * 2/3 + 5, y - height / 2);
    
        this.speedRectangle = this.regularRectangle(x, y, width, height, radius);
        this.speedSelectedRectangle = this.selectedRectangle(x, y, width, height, radius);
        this.speedChangingRectangle = this.changingRectangle(x, y, width, height, radius);
    
        this.container.addChild(this.speedRectangle);
        this.container.addChild(this.speedText);
        this.container.addChild(this.speedLegend);
        this.container.addChild(this.speedUnits);

        app.stage.addChild(this.container);
    }

    regularRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 35% 
        let lineColour = 0x000000;  // Black
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 0.25;       // 25%
        let linePosition = 0;       // 


        var speedRectangle = new Graphics();
        speedRectangle.beginFill(fillColour, fillAlpha); 
        speedRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(speedRectangle, x, y - height, width, height, radius, true, true, false, false);
    
        speedRectangle.endFill();
    
        return(speedRectangle);
    }

    selectedRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 25% 
        let lineColour = 0xFF0000;  // red
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = 1.00;       // 100%
        let linePosition = 0.5;       // middle

        var speedRectangle = new Graphics();
        speedRectangle.beginFill(fillColour, fillAlpha); 
        speedRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(speedRectangle, x, y - height, width, height, radius, true, true, false, false);
    
        speedRectangle.endFill();
    
        return(speedRectangle);
    }

    changingRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.75;       // 75% 
        let lineColour = 0x7FFF00;  // chartreuse 
        let lineThickness = 2;      // 1 pixel
        let lineAlpha = .50;       // 100%
        let linePosition = 0;       // middle

        var speedRectangle = new Graphics();
        speedRectangle.beginFill(fillColour, fillAlpha); 
        speedRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(speedRectangle, x, y - height, width, height, radius, true, true, false, false);
    
        speedRectangle.endFill();
    
        return(speedRectangle);
    }  
    
    callback(selected, changable, value){
        // Handle a call back from the main line to deal with selecting and
        // changing the qnh value. We expect to be selected first then have
        // the changable flag added to allow changes. The value should be 
        // in sequence from where it was last.

        // Process changeable first as it should be enabled last
        if (changable && !this.changable) {
            // we just became changable
            this.changable = true; // set the changable flag to true
            this.changeableFirstPass = true;

            // clear the selected flag to allow detetion of a selected mode
            // when changable goes false
            this.selected = false;

            // Change to a changeable Container
            this.container.removeChildren();
            this.container.addChild(this.speedChangingRectangle);
            this.container.addChild(this.speedText);
            this.container.addChild(this.speedLegend);
            this.container.addChild(this.speedUnits);
        } else if (!changable && this.changable){
            this.changable = false;
        }

        // check if the selected parameter has changed and we are not changable
        if (selected && !this.selected && !changable) {
            // we just became selected
            this.selected = true;

            // Change to a selected Container
            this.container.removeChildren();
            this.container.addChild(this.speedSelectedRectangle);
            this.container.addChild(this.speedText);
            this.container.addChild(this.speedLegend);
            this.container.addChild(this.speedUnits);

        // check if
        } else if (!selected && this.selected) {
            this.selected = false;
            // // Change to a regular container
            // this.container.removeChildren();
            // this.container.addChild(this.speedRectangle);
            // this.container.addChild(this.speedText);
            // this.container.addChild(this.speedLegend);
            // this.container.addChild(this.speedUnits);
        }

        if (!selected && !changable ) {
            // Change to a regular container
            this.container.removeChildren();
            this.container.addChild(this.speedRectangle);
            this.container.addChild(this.speedText);
            this.container.addChild(this.speedLegend);
            this.container.addChild(this.speedUnits);
        }

        // process the encoder value provided
        if (changable && !this.changeableFirstPass) {
            this.displayItem = Math.abs(value % 2);

            if (this.displayItem == GS) {
                this.speedLegend.text = "GS";
            }
            else if (this.displayItem == TAS) {
                this.speedLegend.text = "TAS";
            
            }
        
            //this.my_value = 2992 + value;

            //this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";
        } else if (this.changeableFirstPass) {
            this.changeableFirstPass = false;
        }

    }

    update() {
        if (this.displayItem == GS) {
            if (this.groundSpeedValue !== undefined) {
                this.speedText.text = String(Math.round(this.groundSpeedValue));
            }
        }
        else if (this.displayItem == TAS) {
            this.speedText.text = String(Math.round(this.trueAirSpeedValue));
        
        }
    }

    set groundSpeed(newValue) {
        this.groundSpeedValue = newValue;
    }

    set staticPressure(newValue) {
        this.staticPressureValue = newValue * 10;
    }

    set differentialPressure(newValue) {
        const GAMMA = 1.401;
        const CONSTANT1 = 2 / (GAMMA - 1);
        const CONSTANT2 = (GAMMA - 1) / GAMMA;
        
        if (newValue >= 0) {
            this.differentialPressureValue = newValue;
        } else {
            this.differentialPressureValue = 0;
        }

        if (this.staticPressureValue > 0) {
            // Calculate Mach number
            this.mach = Math.sqrt(CONSTANT1 * (
                Math.pow((this.differentialPressureValue / this.staticPressureValue) + 1, CONSTANT2) - 1));
        } else {
            this.mach = 0;
        }
        //console.log("mach = " + this.mach)
    }

    set indicatedTemperature(newValue) {
        const CONVERTTOKELVIN = 273.15;  // add to celcius
        const RECOVERYFACTOR = 0.95;
        const CONVERTMPSTOKNOTS = 1.943844

        const RAIR = 287.05;             // J / kg-K
        const GAMMA = 1.401;
        const CONSTANT1 = Math.sqrt(GAMMA * RAIR) * CONVERTMPSTOKNOTS;

        this.outsideAirTemperatureValue = (newValue + CONVERTTOKELVIN) / (1 + 0.2 * RECOVERYFACTOR * Math.pow(this.mach,2));
        this.speedOfSoundValue = CONSTANT1 * Math.sqrt(this.outsideAirTemperatureValue);
        this.trueAirSpeedValue = this.mach * this.speedOfSoundValue;


        //console.log("temp = " + this.outsideAirTemperatureValue)
        //console.log("C = " + this.speedOfSoundValue);
    }
}