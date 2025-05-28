'use strict';

import { drawSpecialRectangle } from './specialRectangle.mjs';
import { calculateCharacterVerticalCentre } from './utilityFunctions.mjs'
import { Container, Graphics, TextStyle, Text} from './pixi.mjs';


/**     
 * Class representing the QNH display.
 */

export class QNHDisplay {
    /**
     * Create a QNHDisplay Object that will display the QNH value and allow it
     *     to be selected and changed by the user
     * @param {PIXI.Application} app The PixiJS application that is the EFIS display
     * @param {number} x The x position of the QNH display in pixels
     * @param {number} y The y position of the QNH display in pixels
     * @param {number} width The width of the QNH display in pixels
     * @param {number} height The height of the QNH display in pixels
     * @param {number} radius The corner radius of the QNH display in pixels
     */
    constructor (app, x , y, width, height, radius){


        // TODO: remove screen_width as I don't think it is used
        this.screen_width = app.screen.width;

        this.selected = false;
        this.changable = false;
        this.changeableFirstPass = false;

        this.my_value = 2992;
    
        // Create the container to hold the PIXI.DisplayObjects.
        this.QNHContainer = new Container();
        this.QNHContainer.sortableChildren = true;

        // Create the PIXI.DisplayObjexts for the QNH Display.
        this.QNHText = this.createQNHText(x, y, width, height);
        this.QNHText.zIndex = 10;
        
        this.QNHUnitText = this.createQNHUnitsText(x, y, width, height);
        this.QNHUnitText.zIndex = 9;
    
        this.QNHRectangle = this.regularRectangle(x, y, width, height, radius);
        this.QNHRectangle.zIndex = 1;

        this.QNHSelectedRectangle = this.selectedRectangle(x, y, width, height, radius);
        this.QNHSelectedRectangle.zIndex = 1;

        this.QNHChangingRectangle = this.changingRectangle(x, y, width, height, radius);
        this.QNHChangingRectangle.zIndex = 1;
    
        // Add the DisplayObject to the Container
        //this.QNHContainer.addChild(this.QNHRectangle);
        this.QNHContainer.addChild(this.QNHText);
        this.QNHContainer.addChild(this.QNHUnitText);
        this.QNHContainer.addChild(this.QNHRectangle);

        // Add the Container to the Stage
        app.stage.addChild(this.QNHContainer);
    }

    createQNHUnitsText(x, y, width, height) {
        let unitStyle, unitVerticalCentre, text, unitText;


        unitStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '12px',
            fill: "aqua",
            fontWeight: "normal"
        });

        unitVerticalCentre = calculateCharacterVerticalCentre('Tahoma', 12, 'normal');

        text = "inHg";
        unitText = new Text({
            text: text,
            style: unitStyle,
            });
        unitText.anchor.set(0, unitVerticalCentre);
        unitText.position.set(x + width*2/3+3, y - height/2);

        return unitText;
    }

    createQNHText(x, y, width, height) {
        let textVerticalCentre;
        // Create a style to be used for the qnh characters
        this.style = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: "aqua",
            fontWeight: "normal"
        });

        textVerticalCentre = calculateCharacterVerticalCentre('Tahoma', 18, 'normal');

        this.QNHFormat = new Intl.NumberFormat('en-US',{minimumFractionDigits: 2});
        let text = this.QNHFormat.format(29.92);
    
        var QNHText = new Text({
            text: text,
            style: this.style
            });
        QNHText.anchor.set(1.0,textVerticalCentre);
        QNHText.position.set(x + width*2/3 , y - height/2);

        return QNHText;
    }

    regularRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.25;       // 35% 
        let lineColour = 0xFFFFFF;  // black
        let lineThickness = 1;      // 1 pixel
        let lineAlpha = 1.0;       // 25%
        let linePosition = 1;       // inside


        var QNHRectangle = new Graphics();
        QNHRectangle.fillStyle = {
            alpha: fillAlpha,
            color: fillColour,    
        };
        QNHRectangle.strokeStyle = {
            alignment: linePosition,
            alpha: lineAlpha,
            color: lineColour,
            width: lineThickness,
        };

        drawSpecialRectangle(QNHRectangle, x, y - height, width, height, radius, false, false, true, true);
        QNHRectangle.stroke();
        QNHRectangle.fill();

        return(QNHRectangle);
    }

    selectedRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.25;       // 25% 
        let lineColour = 0xFF0000;  // red
        let lineThickness = 2;      // 2 pixel
        let lineAlpha = 1.0;       // 100%
        let linePosition = 0.5;       // outside

        var QNHRectangle = new Graphics();
        QNHRectangle.fillStyle = {
            alpha: fillAlpha,
            color: fillColour,    
        };
        QNHRectangle.strokeStyle = {
            alignment: linePosition,
            alpha: lineAlpha,
            color: lineColour,
            width: lineThickness,
        };
    
        drawSpecialRectangle(QNHRectangle, x, y - height, width, height, radius, false, false, true, true);
        QNHRectangle.stroke();
        QNHRectangle.fill();

        return(QNHRectangle);
    }

    changingRectangle(x, y, width, height, radius){
        // Draw Custom Rectangle
        let fillColour = 0x000000;  // black
        let fillAlpha = 0.75;       // 75% 
        let lineColour = 0x00FFFF;  // cyan???
        let lineThickness = 2;      // 1 pixel
        let lineAlpha = 1.0;          // 100%
        let linePosition = 0.5;       // outside

        var QNHRectangle = new Graphics();
        QNHRectangle.fillStyle = {
            alpha: fillAlpha,
            color: fillColour,    
        };
        QNHRectangle.strokeStyle = {
            alignment: linePosition,
            alpha: lineAlpha,
            color: lineColour,
            width: lineThickness,
        };
    
        drawSpecialRectangle(QNHRectangle, x, y - height, width, height, radius, false, false, true, true);
        QNHRectangle.stroke();
        QNHRectangle.fill();

        return(QNHRectangle);
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
            this.QNHContainer.removeChild(this.QNHRectangle);
            this.QNHContainer.addChild(this.QNHSelectedRectangle);
        }
        
        if (changable && !this.changable) {
            this.changable = true;
            this.QNHContainer.removeChild(this.QNHSelectedRectangle);
            this.QNHContainer.addChild(this.QNHChangingRectangle);
        }

        if (!changable && this.changable) {
            this.changable = false;
            this.QNHContainer.removeChild(this.QNHChangingRectangle);
            this.QNHContainer.addChild(this.QNHSelectedRectangle);
        }

        if (!selected && this.selected) {
            this.selected = false;
            this.QNHContainer.removeChild(this.QNHSelectedRectangle);
            this.QNHContainer.addChild(this.QNHRectangle);
        }

        // process the encoder value provided
        // The preceding code was changed and setting this.changeableFirstPass
        // was removed. It may need to be added again. <<< REVIEW
        if (changable && !this.changeableFirstPass) {
            this.my_value = 2992 + value;

            this.QNHText.text = this.QNHFormat.format(Math.floor(this.my_value)/100);
        } else if (this.changeableFirstPass) {
            this.changeableFirstPass = false;
        }

    }



    set value(new_value) {
        this.my_value = new_value
        this.QNHText.text = this.QNHFormat.format(Math.floor(new_value)/100);
    }

    get value() {
        return this.my_value;
    }

}