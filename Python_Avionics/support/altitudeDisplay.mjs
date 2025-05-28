/** Enable strict mode for enhanced error checking */
'use strict';

import { drawSpecialRectangle } from './specialRectangle.mjs';
import { Container, Graphics, TextStyle, Text} from './pixi.mjs';


/**     
 * Class representing the altitude display.
 * 
 * 
 */


 const GPS = 0;
 const PRESS = 1;
 const DEN = 2;

export class AltitudeDisplay {

    constructor (app, x , y, width, height, radius){

        this.screen_width = app.screen.width;
        this.selected = false;
        this.changable = false;
        this.changeableFirstPass = false;

        this.gpsAltitudeValue = 0;
        this.pressureAltitudeValue = 0;
        this.densityAltitudeValue = 0;

        this.container = new Container();
        this.colour = "chartreuse";

        this.displayItem = GPS;
    
        // Create a style to be used for the altitude characters
        this.style = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: this.colour,
            fontWeight: "normal"
        });

        this.unitsStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '12px',
            fill: this.colour,
            fontWeight: "normal"
        });
    

        let valueText = "0"
        let legendText = "GPS"
        let unitsText = "ft" 
    
        this.altitudeText = new Text({
            text: valueText, 
            style: this.style
            });
        this.altitudeText.anchor.set(1,.5);
        this.altitudeText.position.set(x + width*2/3 , y - height/2);

        this.altitudeLegend = new Text({
            text: legendText,
            style: this.unitsStyle,
            });
        this.altitudeLegend.anchor.set(0,.87);
        this.altitudeLegend.position.set(x + width * 2/3 + 5, y - height / 2);

        this.altitudeUnits = new Text({
            text: unitsText, 
            style: this.unitsStyle
            });
        this.altitudeUnits.anchor.set(0,.17);
        this.altitudeUnits.position.set(x + width * 2/3 + 5, y - height / 2);
    
        this.altitudeRectangle = this.regularRectangle(x, y, width, height, radius);
        this.altitudeSelectedRectangle = this.selectedRectangle(x, y, width, height, radius);
        this.altitudeChangingRectangle = this.changingRectangle(x, y, width, height, radius);
    
        this.container.addChild(this.altitudeRectangle);
        this.container.addChild(this.altitudeText);
        this.container.addChild(this.altitudeLegend);
        this.container.addChild(this.altitudeUnits);

        app.stage.addChild(this.container);
    }

    regularRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.25;       // 25% 
        let lineColour = 0x000000;  // Black
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 0.25;       // 25%
        let linePosition = 1;       // inside


        var altitudeRectangle = new Graphics();

        altitudeRectangle.fillStyle = {
            color: fillColour,
            alpha: fillAlpha
        }

        altitudeRectangle.strokeStyle = {
            width: lineThickness,
            color: lineColour,
            alpha: lineAlpha,
            alignment: linePosition,
        }
    
        drawSpecialRectangle(altitudeRectangle, x, y - height, width, height, radius, true, true, false, false);
        altitudeRectangle.fill();
        altitudeRectangle.stroke();

    
        return(altitudeRectangle);
    }

    selectedRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 35% 
        let lineColour = 0xFF0000;  // red
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = 1.00;       // 100%
        let linePosition = 0;       // outside

        var altitudeRectangle = new Graphics();

        altitudeRectangle.fillStyle = {
            color: fillColour,
            alpha: fillAlpha
        }

        altitudeRectangle.strokeStyle = {
            width: lineThickness,
            color: lineColour,
            alpha: lineAlpha,
            alignment: linePosition,
        }
    
        drawSpecialRectangle(altitudeRectangle, x, y - height, width, height, radius, true, true, false, false);
        altitudeRectangle.fill();
        altitudeRectangle.stroke();

    
        return(altitudeRectangle);
    }

    changingRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.75;       // 75% 
        let lineColour = 0x7FFF00;  // chartreuse 
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 1.0;        // 100%
        let linePosition = 0;       // outside

        var altitudeRectangle = new Graphics();

        altitudeRectangle.fillStyle = {
            color: fillColour,
            alpha: fillAlpha
        }

        altitudeRectangle.strokeStyle = {
            width: lineThickness,
            color: lineColour,
            alpha: lineAlpha,
            alignment: linePosition,
        }
    
        drawSpecialRectangle(altitudeRectangle, x, y - height, width, height, radius, true, true, false, false);
        altitudeRectangle.fill();
        altitudeRectangle.stroke();

    
        return(altitudeRectangle);
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
            this.container.addChild(this.altitudeChangingRectangle);
            this.container.addChild(this.altitudeText);
            this.container.addChild(this.altitudeLegend);
            this.container.addChild(this.altitudeUnits);
        } else if (!changable && this.changable){
            this.changable = false;
        }

        // check if the selected parameter has changed and we are not changable
        if (selected && !this.selected && !changable) {
            // we just became selected
            this.selected = true;

            // Change to a selected Container
            this.container.removeChildren();
            this.container.addChild(this.altitudeSelectedRectangle);
            this.container.addChild(this.altitudeText);
            this.container.addChild(this.altitudeLegend);
            this.container.addChild(this.altitudeUnits);

        // check if
        } else if (!selected && this.selected) {
            this.selected = false;
            // // Change to a regular container
            // this.container.removeChildren();
            // this.container.addChild(this.altitudeRectangle);
            // this.container.addChild(this.altitudeText);
            // this.container.addChild(this.altitudeLegend);
            // this.container.addChild(this.altitudeUnits);
        }

        if (!selected && !changable ) {
            // Change to a regular container
            this.container.removeChildren();
            this.container.addChild(this.altitudeRectangle);
            this.container.addChild(this.altitudeText);
            this.container.addChild(this.altitudeLegend);
            this.container.addChild(this.altitudeUnits);
        }

        // process the encoder value provided
        if (changable && !this.changeableFirstPass) {
            this.displayItem = Math.abs(value % 3);

            if (this.displayItem == GPS) {
                this.altitudeLegend.text = "GPS";
            }
            else if (this.displayItem == PRESS) {
                this.altitudeLegend.text = "PRE";
            }
            else if (this.displayItem == DEN) {
                this.altitudeLegend.text = "DEN";
            }
        
            //this.my_value = 2992 + value;

            //this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";
        } else if (this.changeableFirstPass) {
            this.changeableFirstPass = false;
        }

    }

    update() {
        if (this.displayItem == GPS) {
            if (this.gpsAltitudeValue !== undefined) {
                this.altitudeText.text = this.gpsAltitudeValue;
            }
        }
        else if (this.displayItem == PRESS) {
            this.altitudeText.text = this.pressureAltitudeValue;
        } 
        else if (this.displayItem == DEN) {
            this.altitudeText.text = this.densityAltitudeValue;
        }
    }

    set gpsAltitude(new_value) {
        this.gpsAltitudeValue = new_value
        //this.speedText.text = this.QNHFormat.format(Math.floor(new_value)/100) + " in";
    }

    get gpsAltitude() {
        return this.gpsAltitudeValue
    }

    //TODO: Delete the setter and getter for densityAltitude
    set densityAltitude(new_value) {
        this.densityAltitudeValue = new_value;
    }

    get densityAltitude() {
        return this.densityAltitudeValue;
    }

    set staticPressure(newValue) {

        this.pressureAltitudeValue = Math.round(145442 * (1 - Math.pow((newValue / 10132.5),0.1902632)));
    }

    set temperature(newValue) {
        const LAPSERATE = 0.0019812;
        const TEMPEXPONENT = 0.234960;
        const CTOK = 273.15;
        const STDTEMPK = CTOK + 15;
        let oATempK = newValue + CTOK;
        let stdTempK =  STDTEMPK - LAPSERATE * this.pressureAltitudeValue;
        this.densityAltitudeValue = Math.round(this.pressureAltitudeValue + (stdTempK/LAPSERATE) * (1 - Math.pow((stdTempK/oATempK),TEMPEXPONENT)));
        //console.log("Ts = " + stdTempK + "| T = "+ oATempK + "| Palt = " + this.pressureAltitudeValue + "| Dalt = " +this.densityAltitudeValue);
    }

}