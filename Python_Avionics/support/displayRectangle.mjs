// 1-June-2025 Update for PixiJS v8
'use strict';

import { drawSpecialRectangle } from './specialRectangle.mjs';
import { calculateCharacterVerticalCentre } from './utilityFunctions.mjs';
import { Container, Graphics, TextStyle, Text} from './pixi.mjs';

/**     
 * Class representing the temperature or time display objects
 */

/*****************************************************************************
 * @brief A class that creates the appropriate display rectangles for 
 *          semi-static data.
 *****************************************************************************/ 
export class DisplayRectangle {

    /*************************************************************************
     * @brief Constructor - 
     * The origin position of the rectangle will be on the side opposite the
     * radii, and on the right side if right aligned otherwise on the left.
     * 
     * @param {PIXI.Application} app The PixiJS application that is the EFIS display
     * @param {number} x The x position of the display in pixels
     * @param {number} y The y position of the display in pixels
     * @param {number} width The width of the display in pixels
     * @param {number} height The height of the display in pixels
     * @param {number} radius The corner radius of the display in pixels
     * @param {boolean} radiusTop True if the radius is on the top
     * @param {boolean} rightAligned True if the origin is on the right
     * @param {boolean} legend True if a legend is to be included
     * 
     *************************************************************************/
    constructor (
        app,
        x, y,
        width, height,
        radius,
        radiusTop,
        rightAligned,
        legend
        ){

        let yAnchor;                    // y position of anchor for legend and
                                        // unit text
        let valueTextX;
        let valueTextY;
        let unitTextX;
        let unitTextY;

        // set up class variables
        this.colour = 0xffffff;         // white - normal
        this.selectedColour = 0xff0000  // red - when selected
        this.changableColour = 0x00ffff // cyan or aqua - when changing

        this.selected = false;          // not currently selected
        this.changable = false;         // not currently changable


        //---------------------------------------------------------------------
        // Create the container to hold the PixiJS objects
        // The objects need to be sortable to ensure they display in the 
        // correct order front to back on the screen

        this.container = new Container();
        this.container.sortableChildren = true;

        //---------------------------------------------------------------------        
        //---------------------------------------------------------------------
        // create the value text including the style

        let font = 'Tahoma';
        let size = 18;
        let weight = 'normal';

        const textStyle = new TextStyle(
            {
                fontFamily: font,
                fontSize: size,
                fill: 'aqua',
                fontWeight: weight,
            }
        );

        let verticalCentre = calculateCharacterVerticalCentre(font, size, weight);

        this.valueText = new Text(
            {
                text: "0",
                style: textStyle,
            }
        );
        if (rightAligned) {
            valueTextX = x - width * 1/3;
        } else {
            valueTextX = x + width * 2/3;
        }
        if (radiusTop) {
            valueTextY = y - height/2;
        } else {
            valueTextY = y + height/2;
        }


        this.valueText.anchor.set(1.0, verticalCentre); // right, middle
        this.valueText.position.set(valueTextX, valueTextY);
        this.valueText.zIndex = 10;

        //---------------------------------------------------------------------
        // create the unit text including the style

        size = 12;

        const unitTextStyle = new TextStyle(
            {
                fontFamily: font,
                fontSize: size,
                fill: 'aqua',
                fontWeight: weight,
            }
        );

        verticalCentre = calculateCharacterVerticalCentre(font, size, weight);

        this.unitText = new Text(
            {
                text: "unt",
                style: unitTextStyle,
            }
        );
        // adjust anghor based on whether we have a legend
        if (legend) {
            yAnchor = 0.17;
        } else {
            yAnchor = 0.5;
        }

        if (rightAligned) {
            unitTextX = x - width * 1/3 + 5;
        } else {
            unitTextX = x + width * 2/3 + 5;
        }
        if (radiusTop) {
            unitTextY = y - height/2;
        } else {
            unitTextY = y + height/2;
        }

        this.unitText.anchor.set(0, yAnchor);
        this.unitText.position.set(unitTextX, unitTextY);
        this.unitText.zIndex = 10;

        //---------------------------------------------------------------------
        // create the legend text including the style

        const legendTextStyle = new TextStyle(
            {
                fontFamily: font,
                fontSize: size,
                fill: 'aqua',
                fontWeight: weight,
            }
        );
        verticalCentre = calculateCharacterVerticalCentre(font, size, weight);

        this.legendText = new Text(
            {
                text: "lgd",
                style: legendTextStyle,
            }
        );
        // adjust anghor based on whether we have a legend
        // -->> Maybe not required
        if (legend) {
            yAnchor = 0.87;
        } else {
            yAnchor = 0.5;      // technically not used??
        }
        this.legendText.anchor.set(0, 0.87);
        this.legendText.position.set(x + width * 2/3 + 5, y - height / 2);
        this.legendText.zIndex = 10;

        //---------------------------------------------------------------------        
        //---------------------------------------------------------------------
        // Create the regular display rectangle stroke and fill styles and
        // the rectangle itself

        const strokeStyle = {
            alignment: 1,       // inside
            alpha: 0.5,         // 50%
            color: 0xFFFFFF,    // white
            width: 1,           // 1 px
        };

        const fillStyle = {
            alpha: 0.25,         // 25% 
            color: 0x000000,     // black
        }

        this.regularRectangle = this.rectangle(
            x, y, 
            width, height, 
            radius, 
            fillStyle, strokeStyle,
            radiusTop,
            rightAligned
        );
        this.regularRectangle.zIndex = 1;   // zIndex of 1 so it is behind
                                            // the text
 
        //---------------------------------------------------------------------
        // Create the selected display stroke and fill styles and 
        // the selected rectangle

        // Update the strokeStyle for the selected rectangle
        Object.assign(strokeStyle, {
            alignment: 0.5,     // middle
            alpha: 1.0,         // 100%
            color: 0xFF0000,    // red
            width: 2,           // 1 px            
        });

        this.selectedRectangle = this.rectangle(
            x, y, 
            width, height, 
            radius, 
            fillStyle, strokeStyle,
            radiusTop,
            rightAligned
        );
        this.selectedRectangle.zIndex = 1;

        //---------------------------------------------------------------------
        // Create the changing display stroke and fill styles and the
        // changing rectangle

        // Update the strokeStyle and fillStyle for the changing rectangle
        strokeStyle.color = 0x00FFFF;   // cyan

        fillStyle.alpha = 1.0;          // 100%

        this.changingRectangle = this.rectangle(
            x, y, 
            width, height, 
            radius, 
            fillStyle, strokeStyle,
            radiusTop,
            rightAligned
        );
        this.changingRectangle.zIndex = 1;        

    };

    rectangle(
        x, y,
        width, height,
        radius,
        fillStyle, strokeStyle,
        top,
        alignRight
        ){
        var rectangle = new Graphics();
        rectangle.fillStyle = fillStyle;
        rectangle.strokeStyle = strokeStyle;

        // adjust the origin to be able to call drawSpecialRectangle

        // check if radii are at the top. if so, our origin is at the bottom
        // so we need to move it to the top.
        if (top) {
            y = y - height;
        };

        // check if we are on the right side of the screen. if so, our origin 
        // is at the right so we need to move it to the left side 
        if (alignRight) {
            x = x - width;
        }

        var bottom = !top;

        drawSpecialRectangle(
            rectangle,
            x, y,
            width, height,
            radius,
            top, top,
            bottom, bottom
        ); 
        rectangle.stroke();
        rectangle.fill();

        return rectangle;
    }

    //-------------------------------------------------------------------------
    // Handle the call back from the main line to deal with selecting and 
    // changing the rectangle. We expect to be selected first then have the 
    // changable flag added to allow changes, The value should be in sequence
    // from where it was last
    //-------------------------------------------------------------------------
    callback(selected, changable, value){
        //---------------------------------------------------------------------
        // Process changes in the selected and changeable status
        // --------------------------------------------------------------------
        if (selected && !this.selected) {
            this.selected = true;
            this.container.removeChild(this.regularRectangle);
            this.container.addChild(this.selectedRectangle);
        }
        
        if (changable && !this.changable) {
            this.changable = true;
            this.container.removeChild(this.selectedRectangle);
            this.container.addChild(this.changingRectangle);
        }

        if (!changable && this.changable) {
            this.changable = false;
            this.container.removeChild(this.changingRectangle);
            this.container.addChild(this.selectedRectangle);
        }

        if (!selected && this.selected) {
            this.selected = false;
            this.container.removeChild(this.selectedRectangle);
            this.container.addChild(this.regularRectangle);
        }        
    }
} 