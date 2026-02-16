'use strict';

import { Container, Graphics, TextStyle, Text } from './pixi.mjs';

/*****************************************************************************
 * Simple toggle menu overlay for the EFIS display.
 * Shows a list of on/off toggles over a dimmed background.
 ****************************************************************************/
export class MenuOverlay {

    /*************************************************************************
     * @param {object} app - PixiJS Application
     * @param {Array} toggleDefs - Array of {label, getState(), setState(val)}
     *************************************************************************/
    constructor(app, toggleDefs) {
        this.app = app;
        this.toggleDefs = toggleDefs;
        this.visible = false;
        this.stateTexts = [];

        const screenW = app.screen.width;
        const screenH = app.screen.height;

        const boxWidth = 400;
        const rowHeight = 50;
        const padding = 10;
        const rowCount = toggleDefs.length + 2; // title + toggles + close
        const boxHeight = rowCount * rowHeight + 2 * padding;
        const boxX = (screenW - boxWidth) / 2;
        const boxY = (screenH - boxHeight) / 2;

        // --- Root container (added/removed from stage on show/hide) ---
        this.overlay = new Container();

        // --- Dimmed background (full canvas, catches taps to dismiss) ---
        const bg = new Graphics();
        bg.fillStyle = { color: 0x000000, alpha: 0.85 };
        bg.rect(0, 0, screenW, screenH);
        bg.fill();
        bg.eventMode = 'static';
        bg.cursor = 'pointer';
        bg.on('pointerdown', (e) => {
            e.stopPropagation();
            this.hide();
        });
        this.overlay.addChild(bg);

        // --- Menu box container ---
        const menuBox = new Container();
        menuBox.position.set(boxX, boxY);
        this.overlay.addChild(menuBox);

        // Box background
        const boxBg = new Graphics();
        boxBg.fillStyle = { color: 0x222222, alpha: 0.95 };
        boxBg.strokeStyle = { color: 0x666666, width: 2, alpha: 1.0, alignment: 1 };
        boxBg.roundRect(0, 0, boxWidth, boxHeight, 8);
        boxBg.fill();
        boxBg.stroke();
        // Block taps from reaching the dismiss background
        boxBg.eventMode = 'static';
        boxBg.on('pointerdown', (e) => { e.stopPropagation(); });
        menuBox.addChild(boxBg);

        // --- Title row ---
        const titleStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 22,
            fill: 0xffffff,
            fontWeight: 'bold',
        });
        const titleText = new Text({ text: 'Menu', style: titleStyle });
        titleText.anchor.set(0.5, 0.5);
        titleText.position.set(boxWidth / 2, padding + rowHeight / 2);
        menuBox.addChild(titleText);

        // --- Toggle rows ---
        const rowInset = 10;
        const rowWidth = boxWidth - 2 * rowInset;

        for (let i = 0; i < toggleDefs.length; i++) {
            const def = toggleDefs[i];
            const rowY = padding + (i + 1) * rowHeight;

            const row = this.createToggleRow(
                def, rowInset, rowY, rowWidth, rowHeight - 6, i
            );
            menuBox.addChild(row);
        }

        // --- Close row ---
        const closeY = padding + (toggleDefs.length + 1) * rowHeight;
        const closeRow = this.createCloseRow(
            rowInset, closeY, rowWidth, rowHeight - 6
        );
        menuBox.addChild(closeRow);
    }

    createToggleRow(def, x, y, width, height, index) {
        const row = new Container();
        row.position.set(x, y);

        // Row background
        const rowBg = new Graphics();
        rowBg.fillStyle = { color: 0x333333, alpha: 0.9 };
        rowBg.roundRect(0, 0, width, height, 4);
        rowBg.fill();
        row.addChild(rowBg);

        // Label text (left-aligned)
        const labelStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 20,
            fill: 0xbbbbbb,
        });
        const label = new Text({ text: def.label, style: labelStyle });
        label.anchor.set(0, 0.5);
        label.position.set(15, height / 2);
        row.addChild(label);

        // State text (right-aligned)
        const state = def.getState();
        const stateText = new Text({
            text: state ? 'ON' : 'OFF',
            style: new TextStyle({
                fontFamily: 'Tahoma',
                fontSize: 20,
                fill: state ? 0x00ffff : 0x666666,
            }),
        });
        stateText.anchor.set(1, 0.5);
        stateText.position.set(width - 15, height / 2);
        row.addChild(stateText);

        this.stateTexts[index] = { text: stateText, def: def };

        // Touch handler
        row.eventMode = 'static';
        row.cursor = 'pointer';
        row.on('pointerdown', (e) => {
            e.stopPropagation();
            const newState = !def.getState();
            def.setState(newState);
            this.updateStateText(index);
        });

        return row;
    }

    createCloseRow(x, y, width, height) {
        const row = new Container();
        row.position.set(x, y);

        const rowBg = new Graphics();
        rowBg.fillStyle = { color: 0x333333, alpha: 0.9 };
        rowBg.roundRect(0, 0, width, height, 4);
        rowBg.fill();
        row.addChild(rowBg);

        const closeStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 20,
            fill: 0xbbbbbb,
        });
        const closeText = new Text({ text: 'Close', style: closeStyle });
        closeText.anchor.set(0.5, 0.5);
        closeText.position.set(width / 2, height / 2);
        row.addChild(closeText);

        row.eventMode = 'static';
        row.cursor = 'pointer';
        row.on('pointerdown', (e) => {
            e.stopPropagation();
            this.hide();
        });

        return row;
    }

    updateStateText(index) {
        const entry = this.stateTexts[index];
        const state = entry.def.getState();
        entry.text.text = state ? 'ON' : 'OFF';
        entry.text.style.fill = state ? 0x00ffff : 0x666666;
    }

    show() {
        if (this.visible) return;
        // Refresh all toggle states
        for (let i = 0; i < this.stateTexts.length; i++) {
            this.updateStateText(i);
        }
        this.app.stage.addChild(this.overlay);
        this.visible = true;
    }

    hide() {
        if (!this.visible) return;
        this.app.stage.removeChild(this.overlay);
        this.visible = false;
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
}
