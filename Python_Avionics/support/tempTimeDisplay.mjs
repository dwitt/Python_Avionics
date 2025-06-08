// 1-June-2025 Update for PixiJS v8
'use strict';

import { DisplayRectangle } from './displayRectangle.mjs';

/**     
 * Class representing the temperature or time display objects
 */

const TEMP = 0;
const TIME = 1;

export class TempTimeDisplay extends DisplayRectangle {

    constructor(app, x , y, width, height, radius){
        super(
            app,
            x, y,
            width, height,
            radius,
            false,          // radius not at top
            false,          // not aligned from the right
            false           // no legend
        )
        let colour, timeValueText, temperatureUnitsText, temperatureValueText;
        let timeZoneText; 


        this.screen_width = app.screen.width;

        this._temperature = 0;
        this._timeHour = 0;
        this._timeMinute = 0;

        this._displayItem = TEMP;
        
        colour = "chartreuse";


        temperatureValueText = "0";
        temperatureUnitsText = "ºC";
        timeValueText = "00:00"
        timeZoneText = "UTC"

        this.valueText.text = temperatureValueText;
        this.unitText.text = temperatureUnitsText;

        this.container.addChild(this.regularRectangle);
        this.container.addChild(this.valueText);
        this.container.addChild(this.unitText);
  
        app.stage.addChild(this.container);
    }

    callback(selected, changable, value){
        
        super.callback(selected, changable, value);
        // Handle a call back from the main line to deal with selecting and
        // changing the time temp value. We expect to be selected first then
        // have the changable flag added to allow changes. The value should be 
        // in sequence from where it was last.

        // process the encoder value provided

        this._displayItem = Math.abs(value % 2);

        if (this._displayItem == TEMP) {
            this.unitText.text = "ºC";
        }
        else if (this._displayItem == TIME) {
            this.unitText.text = "UTC";
        
        }
        
            //this.my_value = 2992 + value;

            //this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";


    }

    update() {
        if (this._displayItem == TEMP) {
            if (this._temperature !== undefined) {
                this._valueText.text = String(this._temperature);
            }
        }
        else if (this._displayItem == TIME) {
            if (this._timeHour !== undefined && this._timeMinute !== undefined) {
                //TODO: properly format the time
                let hourString = String(this._timeHour);
                if (hourString.length == 1) {
                    hourString = '0' + hourString;
                }
                let minuteString = String(this._timeMinute);
                if (minuteString.length == 1) {
                    minuteString = '0' + minuteString;
                }
                this._valueText.text = hourString + ":" + minuteString
             }
        
        }
    }

    set temperature(newValue) {
        this._temperature = newValue;
    }

    set timeHour(newValue) {
        this._timeHour = newValue;
    }

    set timeMinute(newValue) {
        this._timeMinute = newValue;
    }

}