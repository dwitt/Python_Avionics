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
        this.changeableFirstPass = false;

        this.my_value = 2992;

        let arc_radius = radius;
    
        // Create the container to hold the PIXI.DisplayObjects.
        this.QNHContainer = new Container();
        this.QNHContainer.sortableChildren = true;

        this.QNHText = this.createQNHText(x, y, width, height);
        this.QNHText.zIndex = 10;
    
        this.QNHRectangle = this.regularRectangle(x, y, width, height, radius);
        this.QNHRectangle.zIndex = 1;
        this.QNHSelectedRectangle = this.selectedRectangle(x, y, width, height, radius);
        this.QNHSelectedRectangle.zIndex = 2;
        this.QNHChangingRectangle = this.changingRectangle(x, y, width, height, radius);
        this.QNHChangingRectangle.zIndex = 3;
    
        this.QNHContainer.addChild(this.QNHRectangle);
        this.QNHContainer.addChild(this.QNHText);

        app.stage.addChild(this.QNHContainer);
    }

    createQNHText(x, y, width, height) {

        // Create a style to be used for the qnh characters
        this.style = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: "aqua",
            fontWeight: "normal"
        });
    
        this.QNHFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 2});
        let text = this.QNHFormat.format(29.92) + " in";
    
        var QNHText = new Text(text, this.style);
        QNHText.anchor.set(.5,.5);
        QNHText.position.set(x + width/2 , y - height/2);

        return QNHText;
    }

    regularRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.35;       // 35% 
        let lineColour = 0x000000;  // black
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 0.25;       // 25%
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
        let lineColour = 0x00FFFF;  // cyan???
        let lineThickness = 2;      // 1 pixel
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
            this.QNHContainer.removeChild(this.QNHRectangle);
            this.QNHContainer.addChild(this.QNHChangingRectangle);
            //this.container.addChild(this.QNHText);
        } else if (!changable && this.changable){
            this.changable = false;
        }

        // check if the selected parameter has changed or if changable state
        // changed to false
        if (selected && !this.selected && !changable) {
            // we just became selected
            this.selected = true;

            // Change to a selected Container
            this.QNHContainer.removeChild(this.QNHChangingRectangle);
            this.QNHContainer.addChild(this.QNHSelectedRectangle);
            //this.container.addChild(this.QNHText);

        } else if (!selected && this.selected) {
            this.selected = false;
            this.QNHContainer.removeChild(this.QNHSelectedRectangle);
            this.QNHContainer.addChild(this.QNHRectangle)
        }

        if (!selected && !changable) {
            // Change to a regular container
            // this.container.removeChildren();
            // this.container.addChild(this.QNHRectangle);
            // this.container.addChild(this.QNHText);
        }

        // process the encoder value provided
        if (changable && !this.changeableFirstPass) {
            this.my_value = 2992 + value;

            this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100) + " in";
        } else if (this.changeableFirstPass) {
            this.changeableFirstPass = false;
        }

    }



    set value(new_value) {
        this.my_value = new_value
        this.QNHText.text = this.QNHFormat.format(Math.floor(new_value)/100) + " in";
    }

    get value() {
        return this.my_value;
    }

}