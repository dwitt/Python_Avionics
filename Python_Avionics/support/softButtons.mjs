'use strict';

import { Container, Graphics, TextStyle, Text, CanvasTextMetrics } from './pixi.mjs';

/***************************************************************************** 
 * Class to display soft buttons on the screen
 * ***************************************************************************/
export class SoftButtons {
    
    /*************************************************************************
     * Constructor
     * @param {object} app Pixijs
     * // @param {number} width the width of the horizontal ribbon
     *************************************************************************/

        constructor(app, callBackClass) {
        
        // save the display dimensions for use elsewhere in the function
        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;
        this.callBackClass = callBackClass;

        // set the height of the soft button display
        const height = 60;
        const numberOfButtons = 4;
        const width = this.displayWidth / numberOfButtons;

        // create the container for the horizontal buttons
        // note: text can only be added to a container so we need both a 
        // container and graphics
        const softButtonContainer = new Container();
        const softButtonGraphics = new Graphics();

        softButtonContainer.y = this.displayHeight - height;

        const buttonContainer = this.createButtonContainer(height, width, "Config");

        // Try some events
        buttonContainer.eventMode = 'static';
        buttonContainer.cursor = 'pointer';
        buttonContainer.on('pointerdown', this.onClick);
        buttonContainer.userData = this;


        
        softButtonContainer.addChild(buttonContainer);

        app.stage.addChild(softButtonContainer);
        }

    /*************************************************************************
     * @brief Create a button container of a prescribed width and height
     * 
     * @param height The height of the button
     * @param width  The width of the button
     * @returns      A graphic container
     */


    createButtonContainer(height, width, text) {

        const buttonContainer = new Container();
        const buttonGraphics = new Graphics();
        const margin = 5;

        buttonGraphics.fillStyle = {
            alpha: 1.0,         // solid
            color: 0xbbbbbb,    // light grey
        };

        buttonGraphics.strokeStyle = {
            alignment: 1,       // inside
            alpha: 1.0,         // solid
            color: 0x000000,    // black
            width: 1,           // 2 px
        }

        let textStyle = new TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: 0x000000,             // gray
            fontWeight: "normal"  
        });

        buttonGraphics.roundRect(margin,
                                 margin,
                                 width - 2 * margin, 
                                 height - 2 * margin,
                                 margin);
        buttonGraphics.fill();
        buttonGraphics.stroke();

        const buttonText = new Text({
            text: text,
            style: textStyle,
        });
        buttonText.anchor.set(0.5,0.5);
        buttonText.position.set(width / 2, height / 2);


        buttonContainer.addChild(buttonGraphics);
        buttonContainer.addChild(buttonText);

        return buttonContainer;
    }

    /*************************************************************************
     * @brief Handle onClick events
     */

    onClick() 
    {
        //console.log(this.userData.callBackClass.displayWidth);
        this.userData.callBackClass.addContainer();
    }


}