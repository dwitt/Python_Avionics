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
 * Class drawing special rounded rectangles
 */


export function drawSpecialRectangle(graphic, x, y, width, height, radius, 
        topLeftRounded, topRightRounded, bottomRightRounded, bottomLeftRounded) {

    if (topLeftRounded) {
        graphic.moveTo(x, y - radius);
        graphic.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI);
    } else {
        graphic.moveTo(x,y);
    }

    if (topRightRounded) {
        graphic.lineTo(x + width - radius, y);
        graphic.arc(x + width - radius, y + radius, 1.5 * Math.PI, 0);
    } else {
        graphic.lineTo(x + width, y);
    }

    if (bottomRightRounded) {
        graphic.lineTo(x + width, y + height - radius);
        graphic.arc(x + width - radius, y + height - radius, radius, 0, .5 * Math.PI);
    } else {
        graphic.lineTo(x + width, y + height);
    }

    if (bottomLeftRounded) {
        graphic.lineTo(x + radius, y + height);
        graphic.arc(x + radius, y + height - radius, radius, .5 * Math.PI, Math.PI)
    } else {
        graphic.lineTo(x, y + height);
    }

    if (topLeftRounded) {
        graphic.lineTo(x, y + radius);
    } else {
        graphic.lineTo(x,y);
    }

        
}
