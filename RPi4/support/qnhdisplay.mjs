'use strict';
/*global PIXI */
import { drawSpecialRectangle } from './specialRectangle.mjs';
// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
var Application = PIXI.Application,
    loader = PIXI.Loader.shared,
    resources = PIXI.Loader.shared.resources,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Rectangle = PIXI.Rectangle,
    Graphics = PIXI.Graphics,
    Container = PIXI.Container,
    Text = PIXI.Text;

/**     
 * Class representing the QNH display.
 * 
 * 
 */

export class QNHDisplay {
    constructor (app, x , y, width, height, radius){

        this.screen_width = app.screen.width;
        this.selected = false;
        this.changable = false;

        this.container = new Container();

        let arc_radius = radius;
    
        // Create a style to be used for the qnh characters
        this.style = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: "aqua",
            fontWeight: "normal"
        });
    
        this.QNHFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 2});
        let text = this.QNHFormat.format(29.92) + " in";
    
        this.QNHText = new Text(text, this.style);
        this.QNHText.anchor.set(.5,.5);
        this.QNHText.position.set(x + width/2 , y - height/2);
    
        this.QNHRectangle = this.regularRectangle(x, y, width, height, radius);
        this.QNHSelectedRectangle = this.selectedRectangle(x, y, width, height, radius);
        this.QNHChangingRectangle = this.changingRectangle(x, y, width, height, radius);
    
        this.container.addChild(this.QNHRectangle);
        this.container.addChild(this.QNHText);

        app.stage.addChild(this.container)
    }

    regularRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 25% 
        let lineColour = 0x000000;  // black
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 0.25;       // 75%
        let linePosition = 0;       // 


        var QNHRectangle = new Graphics();
        QNHRectangle.beginFill(fillColour, fillAlpha); 
        QNHRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(QNHRectangle, x, y - height, width, height, radius, false, false, true, true);
    
        QNHRectangle.endFill();
    
        return(QNHRectangle);
    }

    selectedRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 25% 
        let lineColour = 0xFF0000;  // red
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = 1.00;       // 100%
        let linePosition = 0.5;       // middle

        var QNHRectangle = new Graphics();
        QNHRectangle.beginFill(fillColour, fillAlpha); 
        QNHRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(QNHRectangle, x, y - height, width, height, radius, false, false, true, true);
    
        QNHRectangle.endFill();
    
        return(QNHRectangle);
    }

    changingRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.75;       // 75% 
        let lineColour = 0x00FFFF;  // red
        let lineThickness = 1;      // 2 pixel
        let lineAlpha = .50;       // 100%
        let linePosition = 0;       // middle

        var QNHRectangle = new Graphics();
        QNHRectangle.beginFill(fillColour, fillAlpha); 
        QNHRectangle.lineStyle(lineThickness,
            lineColour, 
            lineAlpha, 
            linePosition);
    
        drawSpecialRectangle(QNHRectangle, x, y - height, width, height, radius, false, false, true, true);
    
        QNHRectangle.endFill();
    
        return(QNHRectangle);
    }  
    
    callback(selected, changable, value){
        // Process changeable first as it should be enabled last
        if (changable && !this.changable) {
            // we just became changable
            this.changable = true;
            this.selected = false; // to allow the change to selected to work

            // Change to a changeable Container
            this.container.removeChildren();
            this.container.addChild(this.QNHChangingRectangle);
            this.container.addChild(this.QNHText);
        } else if (!changable && this.changable){
            this.changable = false;
        }

        // check if the selected parameter has changed
        if (selected && !this.selected && !changable) {
            // we just became selected
            this.selected = true;

            // Change to a selected Container
            this.container.removeChildren();
            this.container.addChild(this.QNHSelectedRectangle);
            this.container.addChild(this.QNHText);

        } else if (!selected && this.selected) {
            this.selected = false;
        }



        if (!selected && !changable) {
            // Change to a regular container
            this.container.removeChildren();
            this.container.addChild(this.QNHRectangle);
            this.container.addChild(this.QNHText);
        }

    }



    set value(new_value) {
        this.QNHText.text = this.QNHFormat.format(Math.floor(new_value)/100) + " in";
    }

}