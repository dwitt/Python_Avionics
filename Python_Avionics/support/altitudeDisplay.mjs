/** Enable strict mode for enhanced error checking */
'use strict';

import { DisplayRectangle } from './displayRectangle.mjs';

/**     
 * Class representing the altitude display.
 * 
 * 
 */

 const GPS = 0;
 const PRESS = 1;
 const DEN = 2;

export class AltitudeDisplay extends DisplayRectangle {

    constructor (app, x , y, width, height, radius){
        super(
            app,
            x, y,
            width, height,
            radius,
            true,           // radius at top
            true,           // aligned from the right
            true            // has legend
        );

        let textColour = 'chartreuse';

        this.gpsAltitudeValue = 0;
        this.pressureAltitudeValue = 0;
        this.densityAltitudeValue = 0;
        this.displayItem = GPS;

        // Set initial text values
        this.valueText.text = "0";
        this.unitText.text = "ft";
        this.legendText.text = "GPS";


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

    callback(selected, changable, value){
        super.callback(selected, changable, value);
        
        // Process the encoder value provided
        if (selected && changable) {
            this.displayItem = Math.abs(value % 3);

            if (this.displayItem == GPS) {
                this.legendText.text = "GPS";
            }
            else if (this.displayItem == PRESS) {
                this.legendText.text = "PRE";
            }
            else if (this.displayItem == DEN) {
                this.legendText.text = "DEN";
            }
        }
    }

    update() {
        if (this.displayItem == GPS) {
            if (this.gpsAltitudeValue !== undefined) {
                this.valueText.text = String(this.gpsAltitudeValue);
            }
        }
        else if (this.displayItem == PRESS) {
            this.valueText.text = String(this.pressureAltitudeValue);
        } 
        else if (this.displayItem == DEN) {
            this.valueText.text = String(this.densityAltitudeValue);
        }
    }

    set gpsAltitude(new_value) {
        this.gpsAltitudeValue = new_value;
    }

    get gpsAltitude() {
        return this.gpsAltitudeValue;
    }

    set densityAltitude(new_value) {
        this.densityAltitudeValue = new_value;
    }

    get densityAltitude() {
        return this.densityAltitudeValue;
    }

    set staticPressure(newValue) {
        this.pressureAltitudeValue = Math.round(145442 * (1 - Math.pow((newValue / 10132.5), 0.1902632)));
    }

    set temperature(newValue) {
        const LAPSERATE = 0.0019812;
        const TEMPEXPONENT = 0.234960;
        const CTOK = 273.15;
        const STDTEMPK = CTOK + 15;
        let oATempK = newValue + CTOK;
        let stdTempK = STDTEMPK - LAPSERATE * this.pressureAltitudeValue;
        this.densityAltitudeValue = Math.round(this.pressureAltitudeValue + (stdTempK/LAPSERATE) * (1 - Math.pow((stdTempK/oATempK), TEMPEXPONENT)));
    }
}