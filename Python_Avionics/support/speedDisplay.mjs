'use strict';

import { drawSpecialRectangle } from './specialRectangle.mjs';
import { Container, Graphics, TextStyle, Text } from './pixi.mjs';

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
        this.container.sortableChildren = true;
        this.colour = "chartreuse";

        this.speedText = this.createSpeedText(x, y, width, height);
        this.speedText.zIndex = 2;

        this.speedLegend = this.createSpeedLegendText(x ,y, width, height);
        this.speedLegend.zIndex = 2;

        this.speedUnits = this.createSpeedUnitsText(x, y, width, height);
        this.speedUnits.zIndex = 2;
    
        this.speedRectangle = this.regularRectangle(x, y, width, height, radius);
        this.speedRectangle.zIndex = 1;
        this.speedSelectedRectangle = this.selectedRectangle(x, y, width, height, radius);
        this.speedSelectedRectangle.zIndex = 1;
        this.speedChangingRectangle = this.changingRectangle(x, y, width, height, radius);
        this.speedChangingRectangle.zIndex = 1;
    
        this.container.addChild(this.speedRectangle);
        this.container.addChild(this.speedText);
        this.container.addChild(this.speedLegend);
        this.container.addChild(this.speedUnits);

        app.stage.addChild(this.container);
    }

    /*************************************************************************
     * @brief Create and return a PixiJS Text object for the text to
     *          be rendered in the speed display box. 
     * 
     * @param {number} x The x position on the display of the speed box
     * @param {number} y The y position on the display of the speed box
     * @param {number} width The width of the speed display box
     * @param {number} height The height of the speed display box
     */
    createSpeedText(x, y, width, height){
        let style, speedText, text;

        style = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: this.colour,
            fontWeight: "normal"
        });

        text = "0" 
        speedText = new Text({
            text: speedText,
            style: style,
        });

        speedText.anchor.set(1,.5);
        speedText.position.set(x + width*2/3 , y - height/2);

        return speedText;
    }

    /*************************************************************************
     * @brief Create and return a PixiJS Text object for the units text to
     *          be rendered in the speed display box. 
     * 
     * @param {number} x The x position on the display of the speed box
     * @param {number} y The y position on the display of the speed box
     * @param {number} width The width of the speed display box
     * @param {number} height The height of the speed display box
     */
    createSpeedUnitsText(x, y, width, height){
        let unitsStyle, speedUnitsText, unitsText;

        unitsStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '12px',
            fill: this.colour,
            fontWeight: "normal"
        });

        unitsText = "kts" 
        speedUnitsText = new Text({
            text: unitsText,
            style: unitsStyle,
        });

        speedUnitsText.anchor.set(0,.17);
        speedUnitsText.position.set(x + width * 2/3 + 5, y - height / 2);

        return speedUnitsText;
    }

    /*************************************************************************
     * @brief Create and return a PixiJS Text object for the legend text to
     *          be rendered in the speed display box. 
     * 
     * @param {number} x The x position on the display of the speed box
     * @param {number} y The y position on the display of the speed box
     * @param {number} width The width of the speed display box
     * @param {number} height The height of the speed display box
     */
    createSpeedLegendText(x, y, width, height){
        let legendStyle, speedLegendText, legendText;

        legendStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '12px',
            fill: this.colour,
            fontWeight: "normal"
        });

        legendText = "GS" 
        speedLegendText = new Text({
            text: legendText,
            style: legendStyle,
        });

        speedLegendText.anchor.set(0,.87);
        speedLegendText.position.set(x + width * 2/3 + 5, y - height / 2);

        return speedLegendText;
    }

    regularRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.25;       // 25% 
        let lineColour = 0xFFFFFF;  // WHITE
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 0.5;       // 50%
        let linePosition = 1;       // inside


        var speedRectangle = new Graphics();
        speedRectangle.fillStyle = {
            alpha: fillAlpha,
            color: fillColour,
        };
        speedRectangle.strokeStyle = {
            alignment: linePosition,
            alpha: lineAlpha,
            color: lineColour,
            width: lineThickness,            
        };
    
        drawSpecialRectangle(speedRectangle, x, y - height, width, height, radius, true, true, false, false);
        speedRectangle.stroke();
        speedRectangle.fill();
    
        return(speedRectangle);
    }

    selectedRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.25;       // 25% 
        let lineColour = 0xFF0000;  // red
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = 1.00;       // 100%
        let linePosition = 0.5;      // middle

        var speedRectangle = new Graphics();
        speedRectangle.fillStyle = {
            alpha: fillAlpha,
            color: fillColour,    
        };
        speedRectangle.strokeStyle = {
            alignment: linePosition,
            alpha: lineAlpha,
            color: lineColour,
            width: lineThickness,
        };
    
        drawSpecialRectangle(speedRectangle, x, y - height, width, height, radius, true, true, false, false);
        speedRectangle.stroke();
        speedRectangle.fill();
    
        return(speedRectangle);
    }

    changingRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.75;       // 75% 
        let lineColour = 0x7FFF00;  // chartreuse 
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = 1.0;        // 100%
        let linePosition = 0.5;       // middle

        var speedRectangle = new Graphics();
        speedRectangle.fillStyle = {
            alpha: fillAlpha,
            color: fillColour,    
        };
        speedRectangle.strokeStyle = {
            alignment: linePosition,
            alpha: lineAlpha,
            color: lineColour,
            width: lineThickness,
        };
    
        drawSpecialRectangle(speedRectangle, x, y - height, width, height, radius, true, true, false, false);
        speedRectangle.stroke();
        speedRectangle.fill();
    
        return(speedRectangle);
    }  
    
    callback(selected, changable, value){
        // Handle a call back from the main line to deal with selecting and
        // changing the qnh value. We expect to be selected first then have
        // the changable flag added to allow changes. The value should be 
        // in sequence from where it was last.

        //---------------------------------------------------------------------
        // Process changes in the selected and changeable status
        // --------------------------------------------------------------------
        if (selected && !this.selected) {
            this.selected = true;
            this.container.removeChild(this.speedRectangle);
            this.container.addChild(this.speedSelectedRectangle);
        }
        
        if (changable && !this.changable) {
            this.changable = true;
            this.container.removeChild(this.speedSelectedRectangle);
            this.container.addChild(this.speedChangingRectangle);
        }

        if (!changable && this.changable) {
            this.changable = false;
            this.container.removeChild(this.speedChangingRectangle);
            this.container.addChild(this.speedSelectedRectangle);
        }

        if (!selected && this.selected) {
            this.selected = false;
            this.container.removeChild(this.speedSelectedRectangle);
            this.container.addChild(this.speedRectangle);
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