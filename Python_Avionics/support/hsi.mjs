'use strict';

import { Container, Graphics, TextStyle, Text } from './pixi.mjs';

/*****************************************************************************
 * HSI — Horizontal Situation Indicator
 * Phase 1a: Compass rose with heading display
 ****************************************************************************/
export class HSI {

    constructor(app, x, y, diameter) {
        this.app = app;
        this.diameter = diameter;
        this.radius = diameter / 2;
        this._heading = 0;
        this._groundTrack = 0;
        this._bugValue = 0;
        this._groundSpeed = 0;
        this._bugIncrement = 1;
        this._bugFastIncrement = 5;
        this._bugFastDeltaThreshold = 3;
        this._lastEncoderValue = 0;
        this.changeableFirstPass = false;
        this.selected = false;
        this.changable = false;

        // --- Root container ---
        this.hsiContainer = new Container();
        this.hsiContainer.position.set(x, y);

        // --- Compass rose (rotates) ---
        this.roseContainer = new Container();
        this._createCompassRose();

        // --- Circular mask for the rose ---
        const mask = new Graphics();
        mask.fillStyle = { color: 0xffffff };
        mask.circle(0, 0, this.radius);
        mask.fill();
        this.roseContainer.addChild(mask);
        this.roseContainer.mask = mask;

        this.hsiContainer.addChild(this.roseContainer);

        // --- Fixed elements (don't rotate) ---
        this.fixedContainer = new Container();
        this._createHeadingBug();    // behind lubber line
        this._createLubberLine();
        this._createAircraftSymbol();
        this._createHeadingBox();
        this._createTrackIndicator();
        this._createBugReadout();
        this._createGroundSpeedReadout();
        this._createSelectionRing();
        this.hsiContainer.addChild(this.fixedContainer);

        app.stage.addChild(this.hsiContainer);
    }

    // -----------------------------------------------------------------------
    // Compass Rose — ticks and labels, built once at construction
    // -----------------------------------------------------------------------
    _createCompassRose() {
        const r = this.radius;
        const ticks = new Graphics();

        // Cardinal and numeric labels every 30°
        const labelDefs = {
            0: 'N', 30: '3', 60: '6', 90: 'E',
            120: '12', 150: '15', 180: 'S', 210: '21',
            240: '24', 270: 'W', 300: '30', 330: '33',
        };
        const cardinals = new Set([0, 90, 180, 270]);

        const numberStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 20,      // was 18
            fill: 0xbbbbbb,    // was 0xcccccc
        });
        const cardinalStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 22,
            fill: 0xffffff,
            fontWeight: 'bold',
        });

        for (let deg = 0; deg < 360; deg += 5) {
            const rad = deg * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            // Determine tick length
            let tickLen;
            if (deg % 10 === 0) {
                tickLen = 16;   // major (every 10°)
            } else {
                tickLen = 10;   // minor (every 5°)
            }

            // Draw tick from outer edge inward
            const outerR = r - 2;
            const innerR = outerR - tickLen;

            // Tick color — white for major, grey for others
            const tickColor = (deg % 10 === 0) ? 0xffffff : 0x999999;
            const tickWidth = (deg % 10 === 0) ? 3 : 2;

            ticks.strokeStyle = { width: tickWidth, color: tickColor };
            // Ticks point inward from the top (0° = up = negative Y)
            ticks.moveTo(sin * outerR, -cos * outerR);
            ticks.lineTo(sin * innerR, -cos * innerR);
            ticks.stroke();

            // Labels at 30° intervals
            if (labelDefs[deg] !== undefined) {
                const labelText = labelDefs[deg];
                const isCardinal = cardinals.has(deg);
                const style = isCardinal ? cardinalStyle : numberStyle;

                const label = new Text({ text: labelText, style: style });
                label.anchor.set(0.5, 0.5);

                // Position labels inside the tick marks
                const labelR = outerR - tickLen - 16;
                label.position.set(sin * labelR, -cos * labelR);

                // Rotate label so it's upright relative to the rose
                label.rotation = rad;

                this.roseContainer.addChild(label);
            }
        }

        this.roseContainer.addChild(ticks);
    }

    // -----------------------------------------------------------------------
    // Lubber line — white triangle at 12 o'clock (fixed)
    // -----------------------------------------------------------------------
    _createLubberLine() {
        const r = this.radius;
        const g = new Graphics();
        const triHeight = 16;
        const triHalfWidth = 10;

        g.fillStyle = { color: 0xffffff };
        g.moveTo(0, -r + 2);                       // tip (inside rose edge)
        g.lineTo(-triHalfWidth, -r - triHeight + 2); // bottom left
        g.lineTo(triHalfWidth, -r - triHeight + 2);  // bottom right
        g.closePath();
        g.fill();

        this.fixedContainer.addChild(g);
    }

    // -----------------------------------------------------------------------
    // Aircraft symbol — small white triangle at centre (fixed)
    // -----------------------------------------------------------------------
    _createAircraftSymbol() {
        const g = new Graphics();

        g.fillStyle = { color: 0xffffff };
        g.moveTo(0, -14);       // nose (top)
        g.lineTo(-8, 7);        // left wing
        g.lineTo(0, 3);         // tail centre
        g.lineTo(8, 7);         // right wing
        g.closePath();
        g.fill();

        this.fixedContainer.addChild(g);
    }

    // -----------------------------------------------------------------------
    // Heading readout box — digital heading above the rose (fixed)
    // -----------------------------------------------------------------------
    _createHeadingBox() {
        const boxWidth = 70;   // was 60
        const boxHeight = 36;  // was 30
        const r = this.radius;

        const headingBox = new Container();
        // Position so bottom edge connects to lubber triangle base (-r - 14)
        headingBox.position.set(0, -r - 14 - boxHeight / 2);

        // Box background
        const bg = new Graphics();
        bg.fillStyle = { color: 0x000000 };  // was 0x222222
        bg.strokeStyle = { color: 0x666666, width: 2 };  // was 0xffffff
        bg.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 0);  // was 4 — sharp corners like EFIS magnifier
        bg.fill();
        bg.stroke();
        headingBox.addChild(bg);

        // Heading text
        const style = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 28,      // was 22 — matches heading magnifier (XL tier)
            fill: 0xffffff,
            fontWeight: 'bold',
        });
        this.headingText = new Text({ text: '000', style: style });
        this.headingText.anchor.set(0.5, 0.5);
        headingBox.addChild(this.headingText);

        this.fixedContainer.addChild(headingBox);
    }

    // -----------------------------------------------------------------------
    // Ground track indicator — magenta diamond on rose edge (fixed container)
    // -----------------------------------------------------------------------
    _createTrackIndicator() {
        const r = this.radius;
        const diamondSize = 8;

        // Container that rotates around centre to position the diamond
        this.trackContainer = new Container();

        const diamond = new Graphics();
        diamond.fillStyle = { color: 0xff00ff };  // magenta
        diamond.moveTo(0, -r + 2);                // top point (on rose edge)
        diamond.lineTo(-diamondSize, -r + 2 + diamondSize);
        diamond.lineTo(0, -r + 2 + diamondSize * 2);
        diamond.lineTo(diamondSize, -r + 2 + diamondSize);
        diamond.closePath();
        diamond.fill();
        this.trackContainer.addChild(diamond);

        this.fixedContainer.addChild(this.trackContainer);
    }

    // -----------------------------------------------------------------------
    // Heading bug — rectangle with V-notch to fit the lubber triangle
    // Sits outside the rose. Bottom edge follows the compass arc.
    // -----------------------------------------------------------------------
    _createHeadingBug() {
        const r = this.radius;
        const outerR = r - 2;          // rose edge (where ticks start)
        const halfWidth = 17;          // bug half-width (20% wider than lubber)
        const bugHeight = 10;          // extends outward from rose edge
        // Notch follows lubber triangle slope (10/14 * bugHeight = 7)
        const notchHalfWidthAtTop = 7;

        this.bugContainer = new Container();

        const bug = new Graphics();
        bug.fillStyle = { color: 0x00ffff };  // cyan

        const topY = -(outerR + bugHeight);

        // Angles for the bottom arc on the rose edge circle
        const halfAngle = Math.asin(halfWidth / outerR);
        const rightAngle = -Math.PI / 2 + halfAngle;
        const leftAngle = -Math.PI / 2 - halfAngle;

        // Notch tip is at the rose edge (same as lubber tip)
        const notchTipY = -outerR;

        // Clockwise from top-left
        bug.moveTo(-halfWidth, topY);
        bug.lineTo(-notchHalfWidthAtTop, topY);  // to left notch edge
        bug.lineTo(0, notchTipY);                 // V-notch tip (at rose edge)
        bug.lineTo(notchHalfWidthAtTop, topY);    // to right notch edge
        bug.lineTo(halfWidth, topY);              // to top-right corner

        // Right side down to rose edge
        const rightArcY = -Math.sqrt(outerR * outerR - halfWidth * halfWidth);
        bug.lineTo(halfWidth, rightArcY);

        // Arc along bottom (rose edge) from right to left
        bug.arc(0, 0, outerR, rightAngle, leftAngle, true);

        // Close back to top-left
        bug.closePath();
        bug.fill();

        this.bugContainer.addChild(bug);
        this.fixedContainer.addChild(this.bugContainer);
    }

    // -----------------------------------------------------------------------
    // Heading bug readout — fixed cyan box showing bug value
    // -----------------------------------------------------------------------
    _createBugReadout() {
        const screenX = this.app.screen.width / 2;
        const screenY = this.app.screen.height / 2;
        const margin = 10;
        const boxWidth = 100;
        const boxHeight = 26;
        const pad = 6;

        const bugBox = new Container();
        // Position in upper-right corner of HSI display window
        bugBox.position.set(screenX - margin - boxWidth / 2, -screenY + margin + boxHeight / 2);

        this.bugBoxWidth = boxWidth;
        this.bugBoxHeight = boxHeight;
        this.bugBoxBg = new Graphics();
        this._drawBugBox(0x666666);
        bugBox.addChild(this.bugBoxBg);

        const labelStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 16,
            fill: 0x00ffff,
        });
        const label = new Text({ text: 'CRS', style: labelStyle });
        label.anchor.set(0, 0.5);
        label.position.set(-boxWidth / 2 + pad, 0);
        bugBox.addChild(label);

        const valueStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 20,
            fill: 0x00ffff,
        });
        this.bugText = new Text({ text: '000°', style: valueStyle });
        this.bugText.anchor.set(1, 0.5);
        this.bugText.position.set(boxWidth / 2 - pad, 0);
        bugBox.addChild(this.bugText);

        this.fixedContainer.addChild(bugBox);
    }

    _drawBugBox(color) {
        const w = this.bugBoxWidth;
        const h = this.bugBoxHeight;
        this.bugBoxBg.clear();
        this.bugBoxBg.fillStyle = { color: 0x000000 };
        this.bugBoxBg.strokeStyle = { color: color, width: 2 };
        this.bugBoxBg.roundRect(-w / 2, -h / 2, w, h, 4);
        this.bugBoxBg.fill();
        this.bugBoxBg.stroke();
    }

    // -----------------------------------------------------------------------
    // Ground speed readout — text below the rose
    // -----------------------------------------------------------------------
    _createGroundSpeedReadout() {
        const r = this.radius;

        const gsStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 20,
            fill: 0xbbbbbb,    // was 0xcccccc
        });
        this.gsText = new Text({ text: 'GS: --- kts', style: gsStyle });
        this.gsText.anchor.set(0.5, 0);
        this.gsText.position.set(0, r + 12);

        this.fixedContainer.addChild(this.gsText);
    }

    // -----------------------------------------------------------------------
    // Ground speed property
    // -----------------------------------------------------------------------
    set groundSpeed(value) {
        this._groundSpeed = value;
        if (value === null || value === undefined) {
            this.gsText.text = 'GS: --- kts';
        } else {
            this.gsText.text = `GS: ${Math.round(value)} kts`;
        }
    }

    get groundSpeed() {
        return this._groundSpeed;
    }

    // -----------------------------------------------------------------------
    // Heading bug property — positions the bug triangle
    // -----------------------------------------------------------------------
    set headingBug(value) {
        value = ((value % 360) + 360) % 360;
        this._bugValue = value;
        this.bugText.text = String(Math.round(value)).padStart(3, '0') + '°';
        this._updateBugPosition();
    }

    get headingBug() {
        return this._bugValue;
    }

    _updateBugPosition() {
        const offset = (this._bugValue - this._heading) * Math.PI / 180;
        this.bugContainer.rotation = offset;
    }

    // -----------------------------------------------------------------------
    // Selection ring — circle around the rose, hidden by default
    // Red when selected, cyan when editing
    // -----------------------------------------------------------------------
    _createSelectionRing() {
        const r = this.radius;
        this.selectionRing = new Graphics();
        this.selectionRing.visible = false;
        this.fixedContainer.addChild(this.selectionRing);
    }

    _drawSelectionRing(color) {
        const r = this.radius - 2;  // match tick mark outer edge
        this.selectionRing.clear();
        this.selectionRing.strokeStyle = { color: color, width: 2 };
        this.selectionRing.circle(0, 0, r);
        this.selectionRing.stroke();
        this.selectionRing.visible = true;
    }

    // -----------------------------------------------------------------------
    // Encoder callback — matches the pattern used by headingIndicator
    // -----------------------------------------------------------------------
    callback(selected, changable, value) {
        // Handle changeable state transitions
        if (changable && !this.changable) {
            this.changable = true;
            this.changeableFirstPass = true;
            this.selected = false;
        }

        if (!changable && this.changable) {
            this.changable = false;
        }

        if (!changable && (selected && !this.selected)) {
            this.selected = true;
        }

        if (!selected && this.selected) {
            this.selected = false;
        }

        // Update selection ring and CRS box border
        if (changable) {
            this._drawSelectionRing(0x00ffff);  // cyan — editing
            this._drawBugBox(0x00ffff);
        } else if (selected) {
            this._drawSelectionRing(0xff0000);  // red — selected
            this._drawBugBox(0xff0000);
        } else {
            this.selectionRing.visible = false;
            this._drawBugBox(0x666666);
        }

        // Process encoder value
        if (changable && !this.changeableFirstPass) {
            let delta = value - this._lastEncoderValue;
            this._lastEncoderValue = value;
            let increment = (Math.abs(delta) >= this._bugFastDeltaThreshold)
                ? this._bugFastIncrement : this._bugIncrement;
            this._bugValue = this._bugValue + delta * increment;
            this._bugValue = ((this._bugValue % 360) + 360) % 360;
            this.bugText.text = String(Math.round(this._bugValue)).padStart(3, '0') + '°';
            this._updateBugPosition();
        } else if (this.changeableFirstPass) {
            this._lastEncoderValue = value;
            this.changeableFirstPass = false;
        }
    }

    // -----------------------------------------------------------------------
    // Ground track property — positions the track diamond
    // -----------------------------------------------------------------------
    set groundTrack(value) {
        value = ((value % 360) + 360) % 360;
        this._groundTrack = value;

        // Rotate the track container relative to current heading
        // (track - heading) gives the angular offset from the lubber line
        const offset = (value - this._heading) * Math.PI / 180;
        this.trackContainer.rotation = offset;
    }

    get groundTrack() {
        return this._groundTrack;
    }

    // -----------------------------------------------------------------------
    // Heading property — rotates the rose and updates the readout
    // -----------------------------------------------------------------------
    set heading(value) {
        // Normalise to 0-360
        value = ((value % 360) + 360) % 360;
        this._heading = value;

        // Rotate rose (negative because heading-up means rotating card opposite)
        this.roseContainer.rotation = -value * Math.PI / 180;

        // Update digital readout (zero-padded 3 digits)
        this.headingText.text = String(Math.round(value)).padStart(3, '0');

        // Reposition ground track indicator relative to new heading
        const trackOffset = (this._groundTrack - value) * Math.PI / 180;
        this.trackContainer.rotation = trackOffset;

        // Reposition heading bug relative to new heading
        this._updateBugPosition();
    }

    get heading() {
        return this._heading;
    }
}
