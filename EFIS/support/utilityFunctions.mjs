// 4-May-2025 - Updated for PixiJS 8.6.6
'use strict';
import { TextStyle, CanvasTextMetrics } from './pixi.mjs';

/**
 * Calculate the vertical anchor that is the centre of the text character
 * @param {string} fontFamilyName The name of the font family
 * @param {number} fontSize The font size in pixels
 * @param {string} fontWeight The font weight
 * @param {number} digitCapitalHeightRatio Height of a capital letter divided 
 *     by the height of the em square. Used to calculate the center of the 
 *     character veritcally.  This is font specific.
 * @param {string} textToMeasure A string of characters to measure. The anchor 
 * point will be calcualted for the string provided.
 * @returns The ertical anchor point that is located at the centre of the 
 *     characters
 */
export function calculateCharacterVerticalCentre(fontFamilyName, 
                                                fontSize, 
                                                fontWeight, 
                                                digitCapitalHeightRatio = 1489/2048,
                                                textToMeasure = "0123456789")
                                                {

    /** Create a style to use when measuring the character sizes */
    let measureTextStyle = new TextStyle({
        fontFamily: fontFamilyName,
        fontSize: String(fontSize)+"px",
        fontWeight: fontWeight
    });

    /** Get the character metrics */
    let sampleMetrics = CanvasTextMetrics.measureText(textToMeasure, measureTextStyle);

    let digitAscentDistance = sampleMetrics.fontProperties.ascent;
    let overallHeight = sampleMetrics.height; 

    /** Calculate where the center of the character is vertically
     *  as a ratio of the height of the sample message. (value between 0 and 1)
     *  This is used for the anchor command.
     */
    var verticalCharacterCentre = ( digitAscentDistance - ((digitCapitalHeightRatio * fontSize)/2)) / (overallHeight);

    return(verticalCharacterCentre);
}