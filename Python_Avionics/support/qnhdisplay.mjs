'use strict';

import { DisplayRectangle } from './displayRectangle.mjs';

// QNH range limits in inHg × 100 format (2800 = 28.00 inHg, 3100 = 31.00 inHg)
const QNH_MIN_INHG_X_100 = 2800;
const QNH_MAX_INHG_X_100 = 3100;

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

        // my_value stores QNH in inHg × 100 (e.g., 2992 = 29.92 inHg)
        // This format preserves two decimal places when stored as an integer
        this.my_value = 2992;
        // Track last encoder position to calculate delta for proper clamping behavior
        this.lastEncoderValue = 0;
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
            // my_value is stored as inHg × 100 (e.g., 2992 = 29.92 inHg)
            // value is an absolute encoder position. Calculate delta from last position
            // and apply to current my_value to maintain proper clamping behavior.
            // This ensures that if we hit a limit, the encoder "sticks" at that limit
            // until rotated the other direction, rather than requiring full rotation back.
            const encoderDelta = value - this.lastEncoderValue;
            const newValue = this.my_value + encoderDelta;
            this.my_value = Math.max(QNH_MIN_INHG_X_100, Math.min(QNH_MAX_INHG_X_100, newValue));
            this.lastEncoderValue = value;
            // Divide by 100 to convert from inHg × 100 to inHg for display (shows 2 decimal places)
            this.valueText.text = this.QNHFormat.format(Math.floor(this.my_value)/100);
        }
    }

    set value(new_value) {
        // new_value is expected to be in inHg × 100 format
        // Clamp value between 2800 (28.00 inHg) and 3100 (31.00 inHg)
        this.my_value = Math.max(QNH_MIN_INHG_X_100, Math.min(QNH_MAX_INHG_X_100, new_value));
        // Divide by 100 to convert from inHg × 100 to inHg for display (shows 2 decimal places)
        this.valueText.text = this.QNHFormat.format(Math.floor(this.my_value)/100);
    }

    get value() {
        // Returns QNH value in inHg × 100 format (e.g., 2992 = 29.92 inHg)
        return this.my_value;
    }
}