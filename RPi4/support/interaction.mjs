'use strict';

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
 * Class supporting user interactions
 */

export class Interactions{
    constructor(app, x , y, width, height, callback) {
        menuButtonContainer = new Container();
        menuButtonGraphics = new Graphics();

        let lineWidth = 2.0;
        let lineColour = 0xFFFFFF;
        let lineAlpha = 1.0;

        menuButtonGraphics.lineStyle(lineWidth, lineColour, lineAlpha);

        let fillColour = 0xFF0000;
        let filaAlpha = 1.0;

        menuButtonGraphics.beginFill(fileColour, fillAlpha);
        menuButtonGraphics.drawRect(x,y,width,height);
        menuButtonGraphics.endFill();

        let menuButtonTextStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "#FFFFFF",
            fontWeight: "normal"  
        });
    
        menuButtonText = new Text("Menu", menuButtonTextStyle);

        menuButtonContainer.addChild(menuButtonGraphics);
        menuButtonContainer.addChild(menuButtonText);

        app.addChild(menuButtonContainer);
        
    }
}