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
var Graphics = PIXI.Graphics,
    Container = PIXI.Container,
    Text = PIXI.Text;

/**     
 * Class representing the speed display.
 * 
 * 
 */


 const GS = 0;
 const TAS = 1;

export class SpeedDisplay {

    constructor (app, x , y, width, height, radius){

        this.screen_width = app.screen.width;
        this.selected = false;
        this.changable = false;

        this.groundSpeedValue = 0;
        this.trueAirSpeedValue = 0;

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
            // Change to a regular container
            this.container.removeChildren();
            this.container.addChild(this.speedRectangle);
            this.container.addChild(this.speedText);
            this.container.addChild(this.speedLegend);
            this.container.addChild(this.speedUnits);
        }

        // if (!selected && !changable ) {
        //     // Change to a regular container
        //     this.container.removeChildren();
        //     this.container.addChild(this.speedRectangle);
        //     this.container.addChild(this.speedText);
        // }

        // process the encoder value provided
        if (changable) {
            this.displayItem = Math.abs(value % 2);

            if (this.displayItem == GS) {
                this.speedLegend.text = "GS";
            }
            else if (this.displayItem == TAS) {
                this.speedLegend.text = "TAS";
            
            }
        
            //this.my_value = 2992 + value;

            //this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";
        }

    }



    set groundSpeed(new_value) {
        this.groundSpeedValue = new_value
        this.speedText.text = this.QNHFormat.format(Math.floor(new_value)/100) + " in";
    }

    get groundSpeed() {
        return this.groundSpeedValue;
    }

    set trueAirSpeed(new_value) {
        this.trueAirSpeedValue = new_value;
    }

    get trueAirSpeed() {
        return this.trueAirSpeedValue;
    }
}