'use strict';
import { Ribbon, Colour_Bar } from './ribbon.mjs';

// V-Speed Configuration (will be made editable via menu system)
const V_SPEEDS = {
    vso: 35,    // Stall speed, landing configuration (bottom of white arc)
    vs1: 40,    // Stall speed, clean configuration (bottom of green arc)
    vfe: 99,    // Maximum flap extended speed (top of white arc)
    vno: 108,   // Maximum structural cruising speed (green→yellow transition)
    vne: 171,   // Never exceed speed (yellow→red line)
};

export class AirspeedRibbon extends Ribbon {
    constructor(app, x, y, height, width, rightSideMarks,
        majorIntervalSize = 100, majorIntervals = 4, minorIntervals = 4,
        allowNegative) {

        let scale = (height / majorIntervals) / majorIntervalSize;

        // Green/Yellow/Red strip (left half of bar, x=0, width=10)
        let speeds_colours = [
            {position: V_SPEEDS.vs1, colour: 0x00ff00},   // Green: Vs1 to Vno
            {position: V_SPEEDS.vno, colour: 0xffff00},   // Yellow: Vno to Vne
            {position: V_SPEEDS.vne, colour: 0xff0000},   // Red: Vne and above
        ];
        let speeds_bar = new Colour_Bar(speeds_colours, 0, 10, 300, scale, false);

        // Add a red Vne tick mark to the speeds bar graphics
        // The matrix transform handles the vertical flip and scale,
        // so positions are in knots and the tick height is in knots too
        let tickHeightInKnots = 2 / scale;  // 2 pixels converted to knot-space
        speeds_bar.graphics.fillStyle = { alpha: 1, color: 0xff0000 };
        speeds_bar.graphics.rect(-10, V_SPEEDS.vne, 30, tickHeightInKnots);
        speeds_bar.graphics.fill();

        // White strip (overlaps green on right side, x=5, width=5)
        let flaps_colours = [
            {position: V_SPEEDS.vso, colour: 0xffffff},   // White: Vso to Vfe
        ];
        let flaps_bar = new Colour_Bar(flaps_colours, 5, 5, V_SPEEDS.vfe, scale, false);

        super(app, x, y, height, width, rightSideMarks,
            majorIntervalSize, majorIntervals, minorIntervals, allowNegative,
            speeds_bar, flaps_bar);
    }
}
