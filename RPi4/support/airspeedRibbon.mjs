import { Ribbon, Colour_Bar } from './ribbon.mjs';
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
        
        let scale = (height / majorIntervals) / majorIntervalSize ;

        // Speeds in knots
        let vsl = 40;
        let vno = 108;
        let vne = 171;

        let vso = 35;
        let vfe = 99; // TODO: FIX, NOT CORRECT

        // Speed colours
        let vsl_colour = 0x00ff00;
        let vno_colour = 0xffff00;
        let vne_colour = 0xff0000;

        let vso_colour = 0xffffff;
        let vfe_colour = 0x000000;

        let colours = [ {position: vsl, colour: vsl_colour},
                        {position: vno, colour: vno_colour},
                        {position: vne, colour: vne_colour}]; 

        let flaps_colours = [   {position: vso, colour: vso_colour}];

        let speeds_bar = new Colour_Bar(colours, 0, 10, 300, scale, false);
        let flaps_bar = new Colour_Bar(flaps_colours, 5, 10, vfe, scale, false)
        // 

        super(app, x, y, height, width, rightSideMarks,
        majorIntervalSize, majorIntervals, minorIntervals, flaps_bar, speeds_bar);
        
        
            
    }


    
    
}