'use strict';

import { Container, Graphics, TextStyle, Text, CanvasTextMetrics } from './pixi.mjs';

/*****************************************************************************
 * Class to display soft buttons on the screen
 * ***************************************************************************/
export class SoftButtons {

    /*************************************************************************
     * Constructor
     * @param {object} app Pixijs
     * @param {object} callBackClass Object with addContainer() method
     * @param {object} options Optional positioning: {x, y, width, height}
     *************************************************************************/

        constructor(app, callBackClass, options = {}) {

        this.displayWidth = app.screen.width;
        this.displayHeight = app.screen.height;
        this.callBackClass = callBackClass;

        const height = options.height || 30;
        const width = options.width || 70;
        const xPos = options.x !== undefined ? options.x : this.displayWidth - width - 5;
        const yPos = options.y !== undefined ? options.y : this.displayHeight - height - 3;

        const softButtonContainer = new Container();
        softButtonContainer.position.set(xPos, yPos);

        const buttonContainer = this.createButtonContainer(height, width, "Menu");

        buttonContainer.eventMode = 'static';
        buttonContainer.cursor = 'pointer';
        buttonContainer.on('pointerdown', this.onClick);
        buttonContainer.userData = this;

        softButtonContainer.addChild(buttonContainer);
        app.stage.addChild(softButtonContainer);
        }

    createButtonContainer(height, width, text) {

        const buttonContainer = new Container();
        const buttonGraphics = new Graphics();
        const margin = 3;

        buttonGraphics.fillStyle = {
            alpha: 0.7,
            color: 0x333333,
        };

        buttonGraphics.strokeStyle = {
            alignment: 1,
            alpha: 0.8,
            color: 0x666666,
            width: 1,
        }

        let textStyle = new TextStyle({
            fontFamily: "Tahoma",
            fontSize: 20,
            fill: 0xbbbbbb,
            fontWeight: "normal"
        });

        buttonGraphics.roundRect(margin,
                                 margin,
                                 width - 2 * margin,
                                 height - 2 * margin,
                                 4);
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

    onClick()
    {
        this.userData.callBackClass.addContainer();
    }

}
