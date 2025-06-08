'use strict';

import { DisplayRectangle } from './displayRectangle.mjs';

/**     
 * Class representing the QNH display.
 */

export class QNHDisplay extends DisplayRectangle {
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
    constructor (app, x, y, width, height, radius) {
        super(
            app,
            x, y,
            width, height,
            radius,
            false,          // radius not at top
            true,           // aligned from the right
            false           // no legend
        );

        this.my_value = 2992;
        this.QNHFormat = new Intl.NumberFormat('en-US', {minimumFractionDigits: 2});

        // Set initial text values
        this.valueText.text = this.QNHFormat.format(29.92);
        this.unitText.text = "inHg";

        // Add the display objects to the container
        this.container.addChild(this.regularRectangle);
        this.container.addChild(this.valueText);
        this.container.addChild(this.unitText);
  
        app.stage.addChild(this.container);
    }
    
    callback(selected, changable, value) {
        super.callback(selected, changable, value);
        
        // Process the encoder value provided
        if (selected && changable) {
            this.my_value = 2992 + value;
            this.valueText.text = this.QNHFormat.format(Math.floor(this.my_value)/100);
        }
    }

    set value(new_value) {
        this.my_value = new_value;
        this.valueText.text = this.QNHFormat.format(Math.floor(new_value)/100);
    }

    get value() {
        return this.my_value;
    }
}