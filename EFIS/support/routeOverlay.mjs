'use strict';

import { Container, Graphics, TextStyle, Text } from './pixi.mjs';

/*****************************************************************************
 * Route overlay for the HSI display.
 * Shows the loaded flight plan waypoints and allows the pilot to tap one
 * to select it, then choose "Leg" (normal) or "Direct To" (captures GPS
 * origin for XTE).
 ****************************************************************************/
export class RouteOverlay {

    /*************************************************************************
     * @param {object} app - PixiJS Application (app2 / HSI canvas)
     * @param {function} sendCommand - callback that sends a dict to the
     *        server via WebSocket (e.g. {active_leg: 3})
     *************************************************************************/
    constructor(app, sendCommand) {
        this.app = app;
        this.sendCommand = sendCommand;
        this.visible = false;

        // Route data (updated each frame via update())
        this._routeWaypoints = null;
        this._activeLeg = null;
        this._directToActive = false;

        // Selection state (two-step: tap to select, then confirm action)
        this._selectedIndex = null;

        // Scroll state
        this._scrollY = 0;
        this._scrollMax = 0;
        this._dragging = false;
        this._dragStartY = 0;
        this._scrollStartY = 0;
        this._dragMoved = false;

        // Overlay container (added/removed from stage on show/hide)
        this.overlay = new Container();

        const screenW = app.screen.width;
        const screenH = app.screen.height;

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

        // --- Panel container (centered, rebuilt on show) ---
        this.panel = new Container();
        this.overlay.addChild(this.panel);
    }

    /***********************************************************************
     * Update stored route data. If the overlay is visible, rebuild rows
     * so the active leg highlight stays current (e.g. auto-sequencing).
     ***********************************************************************/
    update(routeWaypoints, activeLeg, directToActive) {
        const changed = (activeLeg !== this._activeLeg) ||
            (routeWaypoints?.length !== this._routeWaypoints?.length) ||
            (directToActive !== this._directToActive);
        this._routeWaypoints = routeWaypoints;
        this._activeLeg = activeLeg;
        this._directToActive = directToActive || false;
        if (this.visible && changed) {
            this._buildPanel();
        }
    }

    /***********************************************************************
     * Show the overlay.
     ***********************************************************************/
    show() {
        if (this.visible) return;
        this._selectedIndex = null;
        this._buildPanel();
        this.app.stage.addChild(this.overlay);
        this.visible = true;
    }

    /***********************************************************************
     * Hide the overlay.
     ***********************************************************************/
    hide() {
        if (!this.visible) return;
        this._selectedIndex = null;
        this.app.stage.removeChild(this.overlay);
        this.visible = false;
    }

    /***********************************************************************
     * Toggle visibility.
     ***********************************************************************/
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /***********************************************************************
     * Build (or rebuild) the panel contents from current route data.
     ***********************************************************************/
    _buildPanel() {
        // Clear previous panel contents
        this.panel.removeChildren();

        const waypoints = this._routeWaypoints;
        if (!waypoints || waypoints.length === 0) return;

        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;

        const boxWidth = 340;
        const rowHeight = 44;
        const padding = 10;
        const rowInset = 10;
        const rowWidth = boxWidth - 2 * rowInset;

        // Bottom area: action buttons if selected, or close + optional cancel D→
        const hasSelection = this._selectedIndex !== null;
        const bottomRowCount = hasSelection ? 1 : (this._directToActive ? 2 : 1);
        const bottomHeight = bottomRowCount * (rowHeight + padding);

        // Fixed rows: title + bottom; scrollable: waypoints
        const titleHeight = rowHeight + padding;
        const maxBoxHeight = screenH - 40;
        const scrollAreaHeight = Math.min(
            waypoints.length * rowHeight,
            maxBoxHeight - titleHeight - bottomHeight - 2 * padding
        );
        const boxHeight = titleHeight + scrollAreaHeight + bottomHeight + 2 * padding;
        const boxX = (screenW - boxWidth) / 2;
        const boxY = (screenH - boxHeight) / 2;

        this.panel.position.set(boxX, boxY);

        // --- Box background ---
        const boxBg = new Graphics();
        boxBg.fillStyle = { color: 0x222222, alpha: 0.95 };
        boxBg.strokeStyle = { color: 0x666666, width: 2, alpha: 1.0, alignment: 1 };
        boxBg.roundRect(0, 0, boxWidth, boxHeight, 8);
        boxBg.fill();
        boxBg.stroke();
        boxBg.eventMode = 'static';
        boxBg.on('pointerdown', (e) => { e.stopPropagation(); });
        this.panel.addChild(boxBg);

        // --- Title ---
        const titleStyle = new TextStyle({
            fontFamily: 'Tahoma',
            fontSize: 22,
            fill: 0xffffff,
            fontWeight: 'bold',
        });
        const titleText = new Text({
            text: 'Route',
            style: titleStyle,
        });
        titleText.anchor.set(0.5, 0.5);
        titleText.position.set(boxWidth / 2, padding + rowHeight / 2);
        this.panel.addChild(titleText);

        // --- Scrollable waypoint area ---
        const scrollTop = padding + titleHeight;
        const totalContentHeight = waypoints.length * rowHeight;
        const needsScroll = totalContentHeight > scrollAreaHeight;

        // Scroll container holds all waypoint rows
        const scrollContainer = new Container();
        scrollContainer.position.set(0, scrollTop);

        // Mask to clip waypoint rows to the scroll area
        const scrollMask = new Graphics();
        scrollMask.rect(0, scrollTop, boxWidth, scrollAreaHeight);
        scrollMask.fill({ color: 0xffffff });
        this.panel.addChild(scrollMask);
        scrollContainer.mask = scrollMask;

        // Reset scroll position
        this._scrollY = 0;
        this._scrollMax = Math.max(0, totalContentHeight - scrollAreaHeight);

        // Build waypoint rows inside scroll container
        for (let i = 0; i < waypoints.length; i++) {
            const wpt = waypoints[i];
            const rowY = i * rowHeight;
            const isActive = (i === this._activeLeg);
            const isSelected = (i === this._selectedIndex);

            const row = new Container();
            row.position.set(rowInset, rowY);

            // Row background
            const rowBg = new Graphics();
            if (isSelected) {
                // Selected: cyan highlight
                rowBg.fillStyle = { color: 0x005577, alpha: 0.9 };
                rowBg.strokeStyle = { color: 0x00ddff, width: 2, alpha: 1.0 };
                rowBg.roundRect(0, 0, rowWidth, rowHeight - 6, 4);
                rowBg.fill();
                rowBg.stroke();
            } else if (isActive) {
                rowBg.fillStyle = { color: 0xff00ff, alpha: 0.7 };
                rowBg.roundRect(0, 0, rowWidth, rowHeight - 6, 4);
                rowBg.fill();
            } else {
                rowBg.fillStyle = { color: 0x333333, alpha: 0.9 };
                rowBg.roundRect(0, 0, rowWidth, rowHeight - 6, 4);
                rowBg.fill();
            }
            row.addChild(rowBg);

            // Waypoint ID (left-aligned) — show D→ prefix if active + direct-to
            const idFill = (isSelected || isActive) ? 0xffffff : 0xbbbbbb;
            const idStyle = new TextStyle({
                fontFamily: 'Tahoma',
                fontSize: 20,
                fill: idFill,
            });
            const prefix = (isActive && this._directToActive) ? 'D\u2192 ' : '';
            const idText = new Text({ text: prefix + wpt.id, style: idStyle });
            idText.anchor.set(0, 0.5);
            idText.position.set(15, (rowHeight - 6) / 2);
            row.addChild(idText);

            // Waypoint type (right-aligned, smaller)
            const typeFill = (isSelected || isActive) ? 0xdddddd : 0x888888;
            const typeStyle = new TextStyle({
                fontFamily: 'Tahoma',
                fontSize: 16,
                fill: typeFill,
            });
            const typeMap = { 'INT': 'WPT', 'INT-VRP': 'VRP', 'USER WAYPOINT': 'GPS' };
            const displayType = !wpt.type ? 'GPS' : (typeMap[wpt.type] || wpt.type);
            const typeText = new Text({ text: displayType, style: typeStyle });
            typeText.anchor.set(1, 0.5);
            typeText.position.set(rowWidth - 15, (rowHeight - 6) / 2);
            row.addChild(typeText);

            // All rows are interactive for drag scrolling
            row.eventMode = 'static';
            row.cursor = 'pointer';

            // pointerdown starts drag tracking
            row.on('pointerdown', (e) => {
                e.stopPropagation();
                this._dragging = true;
                this._dragMoved = false;
                this._dragStartY = e.global.y;
                this._scrollStartY = this._scrollY;
            });

            // pointerup selects waypoint only if we didn't drag (skip departure)
            if (i >= 1) {
                row.on('pointerup', ((index) => (e) => {
                    e.stopPropagation();
                    if (!this._dragMoved) {
                        this._selectedIndex = index;
                        this._buildPanel();
                    }
                    this._dragging = false;
                })(i));
            } else {
                row.on('pointerup', () => { this._dragging = false; });
            }

            scrollContainer.addChild(row);
        }

        // Global move/up handlers for drag scrolling (work even if pointer leaves rows)
        if (needsScroll) {
            scrollContainer.eventMode = 'static';
            scrollContainer.on('globalpointermove', (e) => {
                if (!this._dragging) return;
                const dy = e.global.y - this._dragStartY;
                if (Math.abs(dy) > 5) this._dragMoved = true;
                this._scrollY = Math.max(0, Math.min(this._scrollMax,
                    this._scrollStartY - dy));
                scrollContainer.position.set(0, scrollTop - this._scrollY);
            });
            scrollContainer.on('pointerupoutside', () => { this._dragging = false; });

            // Scroll indicators
            const indicatorStyle = new TextStyle({
                fontFamily: 'Tahoma', fontSize: 12, fill: 0x666666,
            });
            const upArrow = new Text({ text: '\u25B2', style: indicatorStyle });
            upArrow.anchor.set(0.5, 0);
            upArrow.position.set(boxWidth - 12, scrollTop + 2);
            this.panel.addChild(upArrow);

            const downArrow = new Text({ text: '\u25BC', style: indicatorStyle });
            downArrow.anchor.set(0.5, 1);
            downArrow.position.set(boxWidth - 12, scrollTop + scrollAreaHeight - 2);
            this.panel.addChild(downArrow);
        }

        this.panel.addChild(scrollContainer);

        // --- Bottom buttons ---
        const bottomY = scrollTop + scrollAreaHeight + padding;

        if (hasSelection) {
            // Action buttons: Leg | Direct To | Cancel — in one row
            const btnCount = 3;
            const btnGap = 8;
            const btnWidth = (rowWidth - (btnCount - 1) * btnGap) / btnCount;
            const btnHeight = rowHeight - 6;

            const buttons = [
                { label: 'Leg',       color: 0x444444, action: () => {
                    this.sendCommand({ active_leg: this._selectedIndex });
                    this.hide();
                }},
                { label: 'Direct To', color: 0x8800aa, action: () => {
                    this.sendCommand({ direct_to: this._selectedIndex });
                    this.hide();
                }},
                { label: 'Cancel',    color: 0x444444, action: () => {
                    this._selectedIndex = null;
                    this._buildPanel();
                }},
            ];

            for (let b = 0; b < buttons.length; b++) {
                const btn = buttons[b];
                const btnContainer = new Container();
                btnContainer.position.set(rowInset + b * (btnWidth + btnGap), bottomY);

                const btnBg = new Graphics();
                btnBg.fillStyle = { color: btn.color, alpha: 0.9 };
                btnBg.roundRect(0, 0, btnWidth, btnHeight, 4);
                btnBg.fill();
                btnContainer.addChild(btnBg);

                const btnStyle = new TextStyle({
                    fontFamily: 'Tahoma',
                    fontSize: 17,
                    fill: 0xffffff,
                });
                const btnText = new Text({ text: btn.label, style: btnStyle });
                btnText.anchor.set(0.5, 0.5);
                btnText.position.set(btnWidth / 2, btnHeight / 2);
                btnContainer.addChild(btnText);

                btnContainer.eventMode = 'static';
                btnContainer.cursor = 'pointer';
                btnContainer.on('pointerdown', (e) => { e.stopPropagation(); });
                btnContainer.on('pointerup', (e) => {
                    e.stopPropagation();
                    btn.action();
                });

                this.panel.addChild(btnContainer);
            }
        } else {
            // No selection — show Close button, and Cancel D→ if direct-to is active
            let currentY = bottomY;

            if (this._directToActive) {
                const cancelDtoRow = new Container();
                cancelDtoRow.position.set(rowInset, currentY);

                const cancelDtoBg = new Graphics();
                cancelDtoBg.fillStyle = { color: 0x883300, alpha: 0.9 };
                cancelDtoBg.roundRect(0, 0, rowWidth, rowHeight - 6, 4);
                cancelDtoBg.fill();
                cancelDtoRow.addChild(cancelDtoBg);

                const cancelDtoStyle = new TextStyle({
                    fontFamily: 'Tahoma',
                    fontSize: 20,
                    fill: 0xffffff,
                });
                const cancelDtoText = new Text({
                    text: 'Cancel D\u2192',
                    style: cancelDtoStyle,
                });
                cancelDtoText.anchor.set(0.5, 0.5);
                cancelDtoText.position.set(rowWidth / 2, (rowHeight - 6) / 2);
                cancelDtoRow.addChild(cancelDtoText);

                cancelDtoRow.eventMode = 'static';
                cancelDtoRow.cursor = 'pointer';
                cancelDtoRow.on('pointerdown', (e) => { e.stopPropagation(); });
                cancelDtoRow.on('pointerup', (e) => {
                    e.stopPropagation();
                    this.sendCommand({ cancel_direct_to: true });
                    this.hide();
                });
                this.panel.addChild(cancelDtoRow);

                currentY += rowHeight + padding;
            }

            // Close button
            const closeRow = new Container();
            closeRow.position.set(rowInset, currentY);

            const closeBg = new Graphics();
            closeBg.fillStyle = { color: 0x333333, alpha: 0.9 };
            closeBg.roundRect(0, 0, rowWidth, rowHeight - 6, 4);
            closeBg.fill();
            closeRow.addChild(closeBg);

            const closeStyle = new TextStyle({
                fontFamily: 'Tahoma',
                fontSize: 20,
                fill: 0xbbbbbb,
            });
            const closeText = new Text({ text: 'Close', style: closeStyle });
            closeText.anchor.set(0.5, 0.5);
            closeText.position.set(rowWidth / 2, (rowHeight - 6) / 2);
            closeRow.addChild(closeText);

            closeRow.eventMode = 'static';
            closeRow.cursor = 'pointer';
            closeRow.on('pointerdown', (e) => {
                e.stopPropagation();
                this.hide();
            });
            this.panel.addChild(closeRow);
        }
    }
}
