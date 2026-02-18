'use strict';

import { DisplayRectangle } from './displayRectangle.mjs';

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


export class SpeedDisplay extends DisplayRectangle {
    constructor(app, x, y, width, height, radius) {
        super(
            app,
            x, y,
            width, height,
            radius,
            true,           // radius at top
            false,          // not aligned from the right
            true            // has legend
        );

        let textColour = 'chartreuse';

        this.groundSpeedValue = 0;
        this.trueAirSpeedValue = 0;
        this.staticPressureValue = 0;
        this.differentialPressureValue = 0;
        this.outsideAirTemperatureValue = 0;
        this.mach = 0;
        this.speedOfSound = 0;
        this.displayItem = GS;

        // Set initial text values
        this.valueText.text = "0";
        this.unitText.text = "kts";
        this.legendText.text = "GS";

        this.valueText.style.fill = textColour;
        this.unitText.style.fill = textColour;
        this.legendText.style.fill = textColour;

        // Add the display objects to the container
        this.container.addChild(this.regularRectangle);
        this.container.addChild(this.valueText);
        this.container.addChild(this.unitText);
        this.container.addChild(this.legendText);

        app.stage.addChild(this.container);
    }
    
    callback(selected, changable, value) {
        super.callback(selected, changable, value);
        
        // Process the encoder value provided
        if (selected && changable) {
            this.displayItem = Math.abs(value % 2);

            if (this.displayItem == GS) {
                this.legendText.text = "GS";
            }
            else if (this.displayItem == TAS) {
                this.legendText.text = "TAS";
            }
        }
    }

    update() {
        if (this.displayItem == GS) {
            if (this.groundSpeedValue !== undefined) {
                this.valueText.text = String(Math.round(this.groundSpeedValue));
            }
        }
        else if (this.displayItem == TAS) {
            this.valueText.text = String(Math.round(this.trueAirSpeedValue));
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
    }

    set indicatedTemperature(newValue) {
        const CONVERTTOKELVIN = 273.15;  // add to celcius
        const RECOVERYFACTOR = 0.95;
        const CONVERTMPSTOKNOTS = 1.943844;

        const RAIR = 287.05;             // J / kg-K
        const GAMMA = 1.401;
        const CONSTANT1 = Math.sqrt(GAMMA * RAIR) * CONVERTMPSTOKNOTS;

        this.outsideAirTemperatureValue = (newValue + CONVERTTOKELVIN) / (1 + 0.2 * RECOVERYFACTOR * Math.pow(this.mach,2));
        this.speedOfSoundValue = CONSTANT1 * Math.sqrt(this.outsideAirTemperatureValue);
        this.trueAirSpeedValue = this.mach * this.speedOfSoundValue;
    }
}