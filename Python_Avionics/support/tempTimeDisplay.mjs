'use strict';
/* global PIXI */
import { drawSpecialRectangle } from './specialRectangle.mjs';
import { calculateCharacterVerticalCentre } from './utilityFunctions.mjs';
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
 * Class representing the temperature or time display objects
 */

const TEMP = 0;
const TIME = 1;

export class TempTimeDisplay {

    constructor(app, x , y, width, height, radius){
        let colour, dataStyle, unitsStyle, timeValueText, temperatureUnitsText, temperatureValueText;
        let valueTextVerticalCentre, textUnitsVerticalCentre;
        let timeZoneText; 


        this.screen_width = app.screen.width;

        this._selected = false;
        this._changable = false;
        this._changeableFirstPass = false;

        this._temperature = 0;
        this._timeHour = 0;
        this._timeMinute = 0;

        this._container = new Container()

        this._displayItem = TEMP;
        
        colour = "chartreuse";

        // Create a style to be used for the data characters
        dataStyle = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: colour,
            fontWeight: "normal"
        });

        unitsStyle = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '12px',
            fill: colour,
            fontWeight: "normal"
        });

        temperatureValueText = "0";
        temperatureUnitsText = "ºC";
        timeValueText = "00:00"
        timeZoneText = "UTC"


        valueTextVerticalCentre = calculateCharacterVerticalCentre('Tahoma', 18, 'normal');
        this._valueText = new Text(temperatureValueText, dataStyle);
        this._valueText.anchor.set(1, valueTextVerticalCentre);
        this._valueText.position.set(x + width*2/3, y - height/2);
        
        textUnitsVerticalCentre = calculateCharacterVerticalCentre('Tahoma', 12, 'normal');
        this._unitsText = new Text(temperatureUnitsText, unitsStyle);
        this._unitsText.anchor.set(0, textUnitsVerticalCentre);
        this._unitsText.position.set(x + width*2/3 + 5, y - height/2);

        this._regularRectangle = this.regularRectangle(x, y, width, height, radius);
        this._selectedRectangle = this.selectedRectangle(x, y, width, height, radius);
        this._changingRectangle = this.changingRectangle(x, y, width, height, radius);
           
        this._container.addChild(this._regularRectangle);
        this._container.addChild(this._valueText);
        this._container.addChild(this._unitsText);
  
        app.stage.addChild(this._container);
    }

    regularRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 35% 
        let lineColour = 0x000000;  // Black
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 0.25;       // 25%
        let linePosition = 0;       // 


        var regularRectangle = new Graphics();
        regularRectangle.beginFill(fillColour, fillAlpha); 
        regularRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(regularRectangle, x, y - height, width, height, radius, false, false, true, true);
    
        regularRectangle.endFill();
    
        return(regularRectangle);
    }

    selectedRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 35% 
        let lineColour = 0xFF0000;  // Red
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = 1.00;       // 100%
        let linePosition = 0.5;     // middle


        var regularRectangle = new Graphics();
        regularRectangle.beginFill(fillColour, fillAlpha); 
        regularRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(regularRectangle, x, y - height, width, height, radius, false, false, true, true);
    
        regularRectangle.endFill();
    
        return(regularRectangle);
    }

    changingRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.75;       // 75% 
        let lineColour = 0x7FFF00;  // chartreuse 
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = .50;        // 50%
        let linePosition = 0;       // 


        var regularRectangle = new Graphics();
        regularRectangle.beginFill(fillColour, fillAlpha); 
        regularRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(regularRectangle, x, y - height, width, height, radius, false, false, true, true);
    
        regularRectangle.endFill();
    
        return(regularRectangle);
    }

    callback(selected, changable, value){
        // Handle a call back from the main line to deal with selecting and
        // changing the qnh value. We expect to be selected first then have
        // the changable flag added to allow changes. The value should be 
        // in sequence from where it was last.

        // Process changeable first as it should be enabled last
        if (changable && !this._changable) {
            // we just became changable
            this._changable = true; // set the changable flag to true
            this._changeableFirstPass = true;

            // clear the selected flag to allow detetion of a selected mode
            // when changable goes false
            this._selected = false;

            // Change to a changeable Container
            this._container.removeChildren();
            this._container.addChildAt(this._changingRectangle);
            this._container.addChild(this._valueText);
            this._container.addChild(this._unitsText)

        } else if (!changable && this._changable){
            this._changable = false;
        }

        // check if the selected parameter has changed and we are not changable
        if (selected && !this._selected && !changable) {
            // we just became selected
            this._selected = true;

            // Change to a selected Container
            this._container.removeChildren();
            this._container.addChildAt(this._selectedRectangle);
            this._container.addChild(this._valueText);
            this._container.addChild(this._unitsText)

        // check if
        } else if (!selected && this._selected) {
            this._selected = false;

        }

        if (!selected && !changable ) {
            // Change to a regular container
            this._container.removeChildren();
            this._container.addChildAt(this._regularRectangle);
            this._container.addChild(this._valueText);
            this._container.addChild(this._unitsText)
        }

        // process the encoder value provided
        if (changable && !this._changeableFirstPass) {
            this._displayItem = Math.abs(value % 2);

            if (this._displayItem == TEMP) {
                this._unitsText.text = "ºC";
            }
            else if (this._displayItem == TIME) {
                this._unitsText.text = "UTC";
            
            }
        
            //this.my_value = 2992 + value;

            //this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";
        } else if (this._changeableFirstPass) {
            this._changeableFirstPass = false;
        }

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