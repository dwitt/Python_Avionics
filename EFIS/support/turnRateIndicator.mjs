'use strict';

import { Container, Graphics } from './pixi.mjs';

/**
 * Turn Rate Indicator - Garmin G5 style magenta bar.
 * Displays a horizontal magenta bar that grows left/right from center
 * proportional to the turn rate. White tick marks indicate standard rate (3°/s).
 */
export class TurnRateIndicator {
    constructor(app, x, y) {
        this.pixelsPerDegSec = 18;
        this.standardRate = 3.0;        // degrees per second
        this.maxRate = 6.0;             // max displayable rate
        this.barHeight = 12;            // height of the magenta bar (2px gap from accent lines)
        this.tickHeight = 16;           // height of reference tick marks

        let container = new Container();
        container.x = x;
        container.y = y;

        // Standard rate tick marks (white, at ±54px from center)
        let standardRatePixels = this.pixelsPerDegSec * this.standardRate;

        let tickGraphics = new Graphics();
        tickGraphics.strokeStyle = {
            width: 2,
            color: 0xFFFFFF,
        };

        // Ticks fit just inside the accent lines (1px inset)
        let tickTop = -this.tickHeight / 2 + 1;
        let tickBottom = this.tickHeight / 2 - 1;

        // Left standard rate tick
        tickGraphics.moveTo(-standardRatePixels, tickTop);
        tickGraphics.lineTo(-standardRatePixels, tickBottom);
        tickGraphics.stroke();

        // Right standard rate tick
        tickGraphics.moveTo(standardRatePixels, tickTop);
        tickGraphics.lineTo(standardRatePixels, tickBottom);
        tickGraphics.stroke();

        // Center reference mark (thinner)
        let centerGraphics = new Graphics();
        centerGraphics.strokeStyle = {
            width: 1,
            color: 0xFFFFFF,
        };
        centerGraphics.moveTo(0, tickTop);
        centerGraphics.lineTo(0, tickBottom);
        centerGraphics.stroke();

        // Recessed accent lines above and below the indicator
        let maxPixels = this.pixelsPerDegSec * this.maxRate;
        let accentGraphics = new Graphics();

        // Dark line on top (at tick mark top edge)
        accentGraphics.strokeStyle = { width: 1, color: 0x333333 };
        accentGraphics.moveTo(-maxPixels, -this.tickHeight / 2);
        accentGraphics.lineTo(maxPixels, -this.tickHeight / 2);
        accentGraphics.stroke();

        // Lighter line on bottom (at tick mark bottom edge)
        accentGraphics.strokeStyle = { width: 1, color: 0x666666 };
        accentGraphics.moveTo(-maxPixels, this.tickHeight / 2);
        accentGraphics.lineTo(maxPixels, this.tickHeight / 2);
        accentGraphics.stroke();

        // Magenta turn rate bar (redrawn each frame)
        this.turnRateBar = new Graphics();

        // Layer order: accents behind, then bar, then ticks on top
        container.addChild(accentGraphics);
        container.addChild(this.turnRateBar);
        container.addChild(tickGraphics);
        container.addChild(centerGraphics);

        app.stage.addChild(container);
    }

    update(turnRate) {
        this.turnRateBar.clear();

        // Clamp turn rate to displayable range
        let clampedRate = Math.max(-this.maxRate, Math.min(this.maxRate, turnRate));
        let barWidth = clampedRate * this.pixelsPerDegSec;

        if (Math.abs(barWidth) < 1) return;

        let halfH = this.barHeight / 2;
        let dir = Math.sign(barWidth);
        // Triangular tip: 130° included angle → each side 25° off vertical
        // Point extension = halfH × tan(25°)
        let pointLen = halfH * Math.tan(25 * Math.PI / 180);
        let shoulderX = barWidth - dir * pointLen;

        // Square at center, triangular point at the tip
        this.turnRateBar.moveTo(0, -halfH);
        this.turnRateBar.lineTo(shoulderX, -halfH);
        this.turnRateBar.lineTo(barWidth, 0);
        this.turnRateBar.lineTo(shoulderX, halfH);
        this.turnRateBar.lineTo(0, halfH);
        this.turnRateBar.closePath();
        this.turnRateBar.fill({ color: 0xFF00FF });
    }
}
