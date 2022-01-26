/*global PIXI */
'use strict';

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

export class UserInput {

    /**
     * The UserInput class allows the user to select between various elements using
     *     the rotary input and then provide new input to these elements. It allows 
     *     each of the elements to register a call back. 
     * 
     *     The class has two modes of operation. In the first mode, rotation of the 
     *     encoder will allow cycle through the registered call backs and indicate to 
     *     the registered element that it is selected. If the user chooses to provide 
     *     input to the element they depress the knob once and they enter a mode where
     *     the rotation of the encoder will provide data to that element.
     * @param {PIXI.Appliation} app The current application. This is used to 
     *     allow debugging information to be displayed on the screen. This 
     *     should be removed in production.
     */
    constructor(app) {

        this.encoderPosition = 0;
        this.encoderButton = false;

        this.lastButton = this.encoderButton;
        this.lastPosition = this.encoderPosition;

        this.itemSelectionMode = false;
        this.firstPass = true;

        // storage for call back and virtual encoder
        this.numberOfCallbacksRegistered = 0;
        this.callbackFunction = new Array();
        this.virtualEncoderValue = new Array();
        this.currentSelection = 0;      // currently selected callback
        this.encoderAdjustment = 0;     // adjustement of encoder position
        this.virtualEncoderForSelection = 0;
        
        // TODO: Remove this later. It is for testing 
        let displayHeight = app.screen.height;

        this.itemSelectorText = this.createTextObjectAt(10, displayHeight);

        this.encoderText = this.createTextObjectAt(50, displayHeight);

        app.stage.addChild(this.itemSelectorText);
        app.stage.addChild(this.encoderText);

        this.app = app;

        //TODO: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Remove
    }

    /**
     * createTextObjectAt creates a text object on the screen for debugging 
     *     purposes. This can be removed when the debugging code is removed
     * @param {number} x The x position of the lower right corner of the text box
     * @param {number} y The y position of the lower right corner of the text box
     * @returns A PIXI.Graphics object of the text box.
     */
    createTextObjectAt(x, y) {

        let textStyle = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '20px',
            fill: "white",
            fontWeight: "normal"
        });

        let textObject = new Text("0", textStyle);
        textObject.anchor.set(0,1);
        textObject.position.set(x, y);

        return textObject

    }


    /**
     *  Processes the encoder position and button inputs and makes calls to 
     *     the appropriate call back functions to indicate if an object is 
     *     selected, not selected, or changable and passes the encoder value
     *     to the changable object
     * @param {number} position The encoders position
     * @param {boolean} button The state of the encoder push button. True is 
     *     depressed. False is released.
     */
    processState(position, button) {
        var encoderPosition;

        // Handle both thefirst time through and until there is a call back 
        //     registered.
        if (this.firstPass) {
            // Save the current encoder position into encoderAdjustment so that
            //     the actual position of the encoder does not mater on startup.

            // TODO: Saving the encoder position does not appear to be working.
            // TODO:     This needs debugging.
            this.encoderAdjustment = position;
            console.log("First Pass processing encoder");
            console.log(this.encoderAdjustment);

            // check if we have any registered callbacks
            if (this.numberOfCallbacksRegistered > 0 && position !== undefined) {

                this.firstPass = false;
            }

        // All regular processing happens here
        } else {
            // We have at least one call back registered
            
            /******************************************************************
             * Handle changes to the push button state first                  *
             ******************************************************************/

            // Check if the button has changed
            if (button != this.lastButton) {

                this.lastButton = button
                if (button == false) {
                    // The button was just released therefore the item selection
                    // mode just changed.
                    // Toggle the item selection mode
                    this.itemSelectionMode = !this.itemSelectionMode
                    
                    // Process the current selection Mode
                    if (this.itemSelectionMode) {
                        // We have entered selection mode which means we can
                        // selected between the items that have been registered

                        // Unselect previous item if there are any
                        if (this.numberOfCallbacksRegistered > 0 ) {
                            this.callbackFunction[this.currentSelection].callback(
                                true,   // The item is selected
                                false,  // The item cannot be adjusted
                                0       // The position should be ignored
                            );
                        }

                        // Save the virtual encoder position for the item that is currently selected
                        // position is the current encoder position
                        // this.virtualEncoderValue[]: holds the last virtual position
                        // this.encoderAdjustment: was the encoder value when this item was selected

                        encoderPosition = (position + 
                            this.virtualEncoderValue[this.currentSelection] -
                            this.encoderAdjustment);
                        this.virtualEncoderValue[this.currentSelection] = encoderPosition;

                    } else {
                        // We have exited selection mode which means 
                        // The currently selected item can be adjusted

                        // save the encoder position so that we can start
                        // at the same place when we return to selection mode
                        this.virtualEncoderForSelection = (position +
                            this.virtualEncoderForSelection -
                            this.encoderAdjustment);
                        
                        // Make the current selected item adjustable
                        if (this.numberOfCallbacksRegistered > 0 ) {
                            this.callbackFunction[this.currentSelection].callback(
                                true,  // The item is selected
                                true,  // The item can be adjusted
                                this.virtualEncoderValue[this.currentSelection]  // last saved encoder value
                            );
                        }

                    }
                    // save the current encoder position to be applied
                    // as the encoder makes adjustments
                    this.encoderAdjustment = position
                }
            }

            /******************************************************************
             * Handle changes to the encoder position after the button state  *
             ******************************************************************/

            // Check if the position has changed
            if (position != this.lastPosition) {
                // Handle changes in the position of the encoder
                if (this.itemSelectionMode) {
                    // We are in selection mode
                    // check if the encoder has moved

                    // calculate new encoder position

                    encoderPosition = (position + 
                                            this.virtualEncoderForSelection -
                                            this.encoderAdjustment);
                    // deslect item
                    this.callbackFunction[this.currentSelection].callback(
                        false,  // item is not selected
                        false,  // item cannot be adjusted
                        0       // should be ignored
                    );

                    let remainder = encoderPosition % this.numberOfCallbacksRegistered;
                    if (remainder < 0) {
                        remainder = remainder + this.numberOfCallbacksRegistered;
                    }
                    this.currentSelection = remainder;



                    // select item
                    this.callbackFunction[this.currentSelection].callback(
                        true,   // item is selected
                        false,  // item cannot be adjusted
                        0       // should be ignored
                    );

                    // TODO: debugging output
                    // Output the currently selected item
                    this.itemSelectorText.text = this.currentSelection.toString();
                    // Calculate and display the encoder value for the item
                    let itemEncoderPosition = this.virtualEncoderValue[this.currentSelection];
                    this.encoderText.text = itemEncoderPosition;


                } else {
                    // we are in adjustment mode
                    
                    // Adjust the selected item
                    
                    encoderPosition = (position + 
                        this.virtualEncoderValue[this.currentSelection] -
                        this.encoderAdjustment);

                    this.callbackFunction[this.currentSelection].callback(
                        true,   // item is selected
                        true,   // item can be adjusted
                        encoderPosition // new position
                    );

                    //TODO: debugging output to the screen
                    this.encoderText.text = encoderPosition.toString();
                }

                // Save the last positoin for the next time through
                this.lastPosition = position;
            }
    
        }


    }

    /**
     * Register a callback function.
     *      The callback must take three parameters
     *      parameter 1 is boolean and indicates if the item is selected (true/false)
     *      parameter 2 is boolean and indicates if the item can be changed (true/false)
     *      parameter 3 is a number and indicates the virtual encoder value
     * 
     * @param {function} callbackFunction That is called when user input needs to 
     *     be directed to the element
     */

    registerCallback(callbackClass){
        this.numberOfCallbacksRegistered = this.callbackFunction.push(callbackClass);
        this.virtualEncoderValue[this.numberOfCallbacksRegistered - 1] = 0;

        if (this.numberOfCallbacksRegistered == 1) {
            // This is the first callback registered so select it and allow it 
            // to be changed
            this.callbackFunction[this.currentSelection].callback(
                true,   // item is selected
                true,   // item can be edited
                this.virtualEncoderValue[this.currentSelection]  // 0 to start
                );
        }
    }

    


}