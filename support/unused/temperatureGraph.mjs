'use strict';
/* global PIXI */

// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
// var Application = PIXI.Application,
//     //TextureCache = PIXI.utils.TextureCache,
//     Sprite = PIXI.Sprite,
//     Rectangle = PIXI.Rectangle,
//     Graphics = PIXI.Graphics,
//     Container = PIXI.Container,
//     Text = PIXI.Text;

/**
 * Class representing the CHT or EGT graphs.
 */

export class TemperatureGraph {
    constructor (app, x, y, label, minTemp, maxTemp, 
        cautionLowTemp, cautionHighTemp, warnTemp){

        this.graphXOrigin = 20;
        this.graphYOrigin = 180;
        this.graphWidth = 120;
        this.graphHeight = 140;
        this.xSteps = 5;
        this.xStepWidth = this.graphWidth / (this.xSteps - 1);

        this.labelStyle = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '18px',
            fill: '#FFFFFF',
            fontWeight: "normal"
        });

        this.xAxisStyle = new PIXI.TextStyle({
            fontFamily: 'Tahoma',
            fontSize: '14px',
            fill: '#FFFFFF',
            fontWeight: "normal"
        });

        // --------------------------------------------------------------------
        // Create the container for the graphic
        this.container = new Container(); // create the container for the graph

        // Position the container based on location provided
        this.container.x = x;
        this.container.y = y;

        // Create a box around the graph
        // TODO: This is temporary and should be removed
        this.box = new Graphics();
        this.box.beginFill(0x000000);
        this.box.lineStyle({width: 1, color: 0xffffff, alpha: 1});
        this.box.drawRect(0,0,240,200);
        this.box.endFill()

        // Create the graph heading label
        this.temperatureText = new Text(label, this.labelStyle);
        this.temperatureText.anchor.set(0.5,1);
        this.temperatureText.position.set(120, 25);

        // Create the graph minimum temp label
        this.minLabel = new Text(minTemp.toString(),this.xAxisStyle);
        this.minLabel.anchor.set(0.5,0);
        this.minLabel.position.set(this.graphXOrigin,
            this.graphYOrigin);

        // Create the graph maximum temp label
        this.maxLabel = new Text(maxTemp.toString(),this.xAxisStyle);
        this.maxLabel.anchor.set(0.5,0);
        this.maxLabel.position.set(this.graphXOrigin + this.graphWidth,
            this.graphYOrigin);

        // Create the graph background

        this.temperatureRectangle = new Graphics(); 

        this.temperatureRectangle.beginFill(0x000000);
        this.temperatureRectangle.lineStyle({width: 1, color: 0xFFFFFF, alpha:1 });
        
        // graph horizontal axis at bottom
        this.temperatureRectangle.moveTo(this.graphXOrigin,
            this.graphYOrigin);
        this.temperatureRectangle.lineTo(this.graphXOrigin + this.graphWidth,
            this.graphYOrigin);

        // graph vertical axis and vertical grid lines
        for (let i = 0; i < this.xSteps; i++) {
            this.temperatureRectangle.moveTo(this.graphXOrigin + (i * this.xStepWidth),
                this.graphYOrigin);
            this.temperatureRectangle.lineTo(this.graphXOrigin + (i * this.xStepWidth),
                this.graphYOrigin - this.graphHeight - 10);
        }

        // graph background finished
        this.temperatureRectangle.endFill();
  
        /*
        Create the horizontal temperature bar backgrounds.
        This will include green, yellow and red regions.
        A mask can be applied to these to limit the portion shown
        */

        this.bar = new Array();
        this.barMask = new Array();

        for (let i = 0; i < 4; i++) {

        [this.bar[i], this.barMask[i]] = this.temperatureBar(this.graphXOrigin,
            this.graphYOrigin - i * 40,
            minTemp, maxTemp,
            cautionLowTemp, cautionHighTemp, warnTemp);
        }

        // TODO: Remove the following code after testing
        // Testing Mask Adjustment
        this.barMask[1].clear();
        this.barMask[1].beginFill(0x00FF00);
        this.barMask[1].lineStyle({width: 0, color: 0x00ff00, alpha: 1});
        this.barMask[1].drawRect(0,0,100,20);
        this.barMask[1].endFill()
        // -----

        // Add all of the geometry to the container
        this.container.addChild(this.box);
        this.container.addChild(this.temperatureRectangle);
        this.container.addChild(this.temperatureText);
        this.container.addChild(this.minLabel);
        this.container.addChild(this.maxLabel);
        for (let i = 0; i < 4; i++) {
            this.container.addChild(this.bar[i]);
        }
        // add the container to the screen
        app.stage.addChild(this.container);


    }

    temperatureBar(
        x, 
        y, 
        minRangeTemp, 
        maxRangeTemp,
        cautionLowTemp = 0,
        cautionHighTemp,
        warnTemp,
        barHeight = 20, 
        barWidth = 120,){
        // Create a container to hold the bar
        var barContainer = new Container();

        // Set the x,y origin of the container
        barContainer.x = x;
        barContainer.y = y - barHeight; // move the origin up so dimensions are positive;

        // Create the bar to be drawn in the container
        var bar = new Graphics();

        // Draw a full grean bar
        bar.beginFill(0x00FF00);
        bar.lineStyle({width: 0, color: 0x00ff00, alpha: 1});
        bar.drawRect(0,0,barWidth,barHeight);
        bar.endFill()

        // add caution low if it exists
        if (cautionLowTemp > minRangeTemp) {
            // draw yellow caution rectangle at the bottom
            let cautionBarWidth = barWidth * (cautionLowTemp - minRangeTemp) / (maxRangeTemp - minRangeTemp);
            bar.beginFill(0xFFFF00); // yellow
            bar.lineStyle({width: 0, color: 0x00ff00, alpha: 1});
            bar.drawRect(0,0,cautionBarWidth,barHeight);
            bar.endFill();
        }

        // add caution high if it exists
        if (cautionHighTemp < maxRangeTemp) {
            // draw yellow caution rectangle at the top
            let cautionBarWidth = barWidth * (maxRangeTemp - cautionHighTemp) / (maxRangeTemp - minRangeTemp);
            let cautionBarStart = barWidth * (cautionHighTemp - minRangeTemp) / (maxRangeTemp - minRangeTemp);
            bar.beginFill(0xFFFF00); // yellow
            bar.lineStyle({width: 0, color: 0x00ff00, alpha: 1});
            bar.drawRect(cautionBarStart,0,cautionBarWidth,barHeight);
            bar.endFill();
        }

        // add warn high if it exists
        if (warnTemp < maxRangeTemp) {
            // draw yellow caution rectangle at the top
            let warnBarWidth = barWidth * (maxRangeTemp - warnTemp) / (maxRangeTemp - minRangeTemp);
            let warnBarStart = barWidth * (warnTemp - minRangeTemp) / (maxRangeTemp - minRangeTemp);
            bar.beginFill(0xFF0000); // yellow
            bar.lineStyle({width: 0, color: 0x00ff00, alpha: 1});
            bar.drawRect(warnBarStart,0,warnBarWidth,barHeight);
            bar.endFill();
        }


        // bar.beginFill(0x00FF00);
        // bar.lineStyle({width: 1, color: 0x00ff00, alpha: 1});
        // bar.drawRect(0,0 - barHeight,barWidth,barHeight);
        // bar.endFill()

        // Create the mask for the above bar
        var barMask = new Graphics();
        barMask.beginFill(0x00FF00);
        barMask.lineStyle({width: 0, color: 0x00ff00, alpha: 1});
        barMask.drawRect(0, 0,barWidth,barHeight);
        barMask.endFill()

        // Assign the mask to the bar
        bar.mask = barMask;

        barContainer.addChild(bar);
        barContainer.addChild(barMask);

        return [barContainer, barMask];
    }
}