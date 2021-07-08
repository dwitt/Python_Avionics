import { Ribbon } from './ribbon.mjs';
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

export class AirspeedRibbon extends Ribbon {
    constructor(app, x, y, height, width, rightSideMarks,
        majorIntervalSize = 100, majorIntervals = 4, minorIntervals = 4) {
        
        super(app, x, y, height, width, rightSideMarks,
        majorIntervalSize, majorIntervals, minorIntervals);
        
        
            
    }

    /**
     * @param {any} new_value new value position airspeed ribbon to
     */

    set value(new_value) {
        super.value = new_value;
    }
}