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
    constructor(app, x , y, width, height) {
        let menuButtonContainer = new Container();
        let menuButtonGraphics = new Graphics();

        let lineWidth = 2.0;
        let lineColour = 0xFFFFFF;
        let lineAlpha = 1.0;

        menuButtonGraphics.lineStyle(lineWidth, lineColour, lineAlpha);

        let fillColour = 0x00A000;
        let fillAlpha = 1.0;

        menuButtonGraphics.beginFill(fillColour, fillAlpha);
        menuButtonGraphics.drawRect(x,y,width,height);
        menuButtonGraphics.endFill();

        let menuButtonTextStyle = new PIXI.TextStyle({
            fontFamily: "Tahoma",
            fontSize: 22,
            fill: "#FFFFFF",
            fontWeight: "normal"  
        });
    
        let menuButtonText = new Text("Menu", menuButtonTextStyle);

        //menuButtonText.position.set(width/2, height/2);
        //menuButtonText.anchor.set(0,0);

        menuButtonGraphics.addChild(menuButtonText);
        menuButtonContainer.addChild(menuButtonGraphics);
        //menuButtonContainer.addChild(menuButtonText);

        app.stage.addChild(menuButtonContainer);
        
    }
}