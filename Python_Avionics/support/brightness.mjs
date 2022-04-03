/*global PIXI */
'use strict';
// ----------------------------------------------------------------------------
// Aliases - Allows for changes in PIXI.JS
// TODO - Make sure we have all of the necessary aliases set
// ----------------------------------------------------------------------------
//var Application = PIXI.Application,
//    loader = PIXI.Loader.shared,
//    resources = PIXI.Loader.shared.resources,
//    TextureCache = PIXI.utils.TextureCache,
//    Sprite = PIXI.Sprite,
//    Rectangle = PIXI.Rectangle,
var Graphics = PIXI.Graphics,
    Container = PIXI.Container;
    //Text = PIXI.Text;

/**     
 * Class representing a brightness indicator.
 */
export class Brightness {
    constructor(app) {

        // all co-ordinates about the center of this indicator
        let displayHeight = app.screen.height;
        // TODO: Remove let displayWidth = app.screen.width;

        // starting brightness setting
        // set the lower range value so that an initial brighness value is the 
        // maximum on a scale of 0 to 100 with an initial encoder input of 0
        this._brightnessStep = 2;
        this._lowerRangeValue = -100; 
        this._brightness = 100;

        let positionFromBottom = 20; // pixels
        this.ballDiameter = 10; // pixels

        this.brightnessContainer = new Container();

        // Construct the brightness indicator
        this.brightnessGraphics = this.createAdjustment();

        // Construct the selected brightness indicator
        this.selectedBrightnessGraphics = this.createSelectedBrightnessGraphics();

        // Construct the changeing brightness indicator
        this.changingBrightnessGraphics = this.createChangableBrightnessGraphics();



        // Add the graphics to the container
        this.brightnessContainer.addChild(this.brightnessGraphics);
        //this.brightnessContainer.addChild(this.selectedBrightnessGraphics);
        //this.brightnessContainer.addChild(this.changingBrightnessGraphics);

        // position the container
        this.brightnessContainer.x = positionFromBottom;
        this.brightnessContainer.y = displayHeight - positionFromBottom;

        // add the container to the app
        app.stage.addChild(this.brightnessContainer);

    }

    createAdjustment(){
        var graphics = new Graphics();

        let backgroundColour = 0xFFFFFF; // white
        let backgroundAlpha = 100;

        let lineWidth = 1; // pixels
        var lineColour = 0xffffff; // white

        let radius = this.ballDiameter/2

        graphics.lineStyle(lineWidth, lineColour);
        graphics.beginFill(backgroundColour, this._brightness/100);

        graphics.drawCircle(0,0, this.ballDiameter/2);
        graphics.endFill()

        let rayOffset = radius + 3;
        let rayEnd = radius + 6;

        for (let i = 0; i < 360; i = i + 45) {
            let angle = i * Math.PI / 180
            graphics.moveTo((rayOffset) * Math.sin(angle), (rayOffset) * Math.cos(angle));
            graphics.lineTo((rayEnd) * Math.sin(angle), (rayEnd) * Math.cos(angle));
        }

        return (graphics);

    }

    createSelectedBrightnessGraphics(){
        // Construct the selected brightness indicator
        var graphics = new Graphics();
        let lineWidth = 2;
        let lineColour = 0xff0000 // Red

        graphics.lineStyle(lineWidth, lineColour);
        graphics.drawCircle(0,0, this.ballDiameter/2);

        let radius = this.ballDiameter/2
        let rayOffset = radius + 3;
        let rayEnd = radius + 6;

        for (let i = 0; i < 360; i = i + 45) {
            let angle = i * Math.PI / 180
            graphics.moveTo((rayOffset) * Math.sin(angle), (rayOffset) * Math.cos(angle));
            graphics.lineTo((rayEnd) * Math.sin(angle), (rayEnd) * Math.cos(angle));
        }

        return(graphics);
    }

    createChangableBrightnessGraphics(){
        // Construct the selected brightness indicator

        let radius = this.ballDiameter/2
        let rayOffset = radius + 3;
        let rayEnd = radius + 6;
        let lineWidth = 2;
        let lineColour = 0x00ffff; // Cyan

        var graphics = new Graphics();

        graphics.lineStyle(lineWidth, lineColour);
        graphics.drawCircle(0,0, this.ballDiameter/2);

        graphics.lineStyle(lineWidth, lineColour);

        for (let i = 0; i < 360; i = i + 45) {
            let angle = i * Math.PI / 180
            graphics.moveTo((rayOffset) * Math.sin(angle), (rayOffset) * Math.cos(angle));
            graphics.lineTo((rayEnd) * Math.sin(angle), (rayEnd) * Math.cos(angle));
        }

        graphics.moveTo(radius + 10, 0);
        graphics.lineTo(radius + 54, 0);

        this.brightnessSlider = new Graphics();

        this.brightnessSlider.lineStyle(4, lineColour);
        this.brightnessSlider.moveTo(radius + 12,-radius);
        this.brightnessSlider.lineTo(radius + 12,radius);

        graphics.addChild(this.brightnessSlider);

        return(graphics);
    }

    drawChangeableGraphic(graphics, alpha){

        let radius = this.ballDiameter/2
        let rayOffset = radius + 3;
        let rayEnd = radius + 6;
        let lineWidth = 2;
        let lineColour = 0x00ffff; // Cyan
        let bgColour = 0xFFFFFF; // White

        graphics.lineStyle(lineWidth, lineColour);

        graphics.beginFill(bgColour, alpha);
        graphics.drawCircle(0,0, this.ballDiameter/2);
        graphics.endFill();

        graphics.lineStyle(lineWidth, lineColour);

        for (let i = 0; i < 360; i = i + 45) {
            let angle = i * Math.PI / 180
            graphics.moveTo((rayOffset) * Math.sin(angle), (rayOffset) * Math.cos(angle));
            graphics.lineTo((rayEnd) * Math.sin(angle), (rayEnd) * Math.cos(angle));
        }

        graphics.moveTo(radius + 10, 0);
        graphics.lineTo(radius + 54, 0);

        this.brightnessSlider = new Graphics();

        this.brightnessSlider.lineStyle(4, lineColour);
        this.brightnessSlider.moveTo(radius + 12,-radius);
        this.brightnessSlider.lineTo(radius + 12,radius);

    }

   /**
     * callback will be called based on the users input to the rotary control.
     * Handles a call back from the main line to deal with selecting and
     * changing the bug value. We expect to be selected first then have
     * the changable flag added to allow changes. The value should be 
     *in sequence from where it was last.
     * @param {boolean} selected When true indicates this display element is selected 
     * @param {boolean} changable When true indicates this display element should 
     *     to the value parameter but only on the second pass through the function 
     * @param {*} value The value of the encoder when changeable is true
     */
     callback(selected, changable, value){
        let _maxBrightness = 100;
        let _minBrightness = 0;
        var _value;


        // Process changeable first as it should be enabled last
        if (changable && !this.changable) {
            // we just became changable
            this.changable = true; // set the changable flag to true
            this.changeableFirstPass = true; 

            // clear the selected flag to allow detetion of a selected mode
            // when changable goes false
            this.selected = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is CHANGEABLE
            // TODO: We came from the SELECTED stte
            //
            this.brightnessContainer.addChild(this.changingBrightnessGraphics);
            //
            // TODO: Remove SELECTED element as we won't know to do this latter
            this.brightnessContainer.removeChild(this.selectedBrightnessGraphics);
            //
            // ----------------------------------------------------------------

        } //else REMOVED else if

        if (!changable && this.changable){
            // we just left the changable state
            this.changable = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is NOT CHANGEABLE
            //
            //this.brightnessContainer.addChild(this.selectedBrightnessGraphics);
            this.brightnessContainer.removeChild(this.changingBrightnessGraphics);
            //
            // ----------------------------------------------------------------
        }

        // check if selectied was just set while we are not changeable
        // if changable is set we can ignor this
        if (!changable && (selected && !this.selected)) {
            // we just became selected 
            // This could come from the CHANGEABLE state
            this.selected = true;

            // ----------------------------------------------------------------
            // TODO: Indicate that the element is SELECTABLE
            //
            this.brightnessContainer.addChild(this.selectedBrightnessGraphics);
            
            // TODO: Consider removing this. It was added for testing. we need
            //          to figure out how to detect selected with coming from
            //          changeable
            //this.brightnessContainer.removeChild(this.brightnessGraphics);

            //
            // ----------------------------------------------------------------


        } // else REMOVED else if
        
        if (!selected && this.selected) {
            // we left the selected state
            this.selected = false;
            // ----------------------------------------------------------------
            // TODO: Indicate that the element is NOT SELECTABLE
            // TODO: This should only occur when going to the NOT SELECTED and
            //          NOT CHANGEABLE state
            this.brightnessContainer.removeChild(this.selectedBrightnessGraphics);
            if (!selected && !changable) {
                //this.brightnessContainer.addChild(this.brightnessGraphics);
            }
            //
            // ----------------------------------------------------------------
        }

        if (!selected && !changable) {
            // TODO: restore the normal screen
            // TODO: Consider moving this up so that it is only done once
            
        }

        // process the encoder value provided
        if (changable && !this.changeableFirstPass) {

            // ----------------------------------------------------------------
            // Process the value provided for the encoder
            //
            // adjust value into current range
            
            _value = value * this._brightnessStep - this._lowerRangeValue

            // check if the adjust value is exceeding the limits and reset range
            if (_value < _minBrightness) {
                _value = _minBrightness;
                this._lowerRangeValue = value * this._brightnessStep;

            } else if (_value > _maxBrightness) {
                _value = _maxBrightness;
                this._lowerRangeValue = (value * this._brightnessStep) - _maxBrightness;

            }

            this._brightness = _value;

            // this.brightnessContainer.removeChild(this.brightnessGraphics);
            // this.brightnessGraphics.clear();

            // let bgColour = 0xFFFFFF; // white
            // let bgAlpha = this._brightness/100;
    
            // let lineWidth = 1; // pixels
            // var lineColour = 0xFFFFFF; // black

            // this.brightnessGraphics.lineStyle(lineWidth, lineColour);
            // this.brightnessGraphics.beginFill(bgColour, bgAlpha);
            // this.brightnessGraphics.drawCircle(0,0, this.ballDiameter/2);
            // this.brightnessGraphics.endFill();

            // this.brightnessContainer.addChild(this.brightnessGraphics);
            this.brightnessSlider.x = this._brightness/2.5;

            //
            // ----------------------------------------------------------------

            // TODO reposition the bug as the value changes

        } else if (this.changeableFirstPass) {
            // TODO: handle any first pasS requirements
            this.brightnessSlider.x = this._brightness/2.5;
            this.changeableFirstPass = false;
        }
    }

    set value(newValue) {
        this._brightness = newValue;
    }

    get value() {
        return this._brightness;
    }

}