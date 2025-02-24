#include <Adafruit_NeoPixel.h>
#include <WitMotion.h>

#define NUMPIXELS 1			// 1 NeoPixel
#define DEBUG				// Debugging if defined


WitMotion			wt901(&Wire);											// sensor Object
Adafruit_NeoPixel	pixels(NUMPIXELS, PIN_NEOPIXEL, NEO_GRB + NEO_KHZ800);	// pixels are wired GRB but colours are RGB

void setup() {
	#if defined(NEOPIXEL_POWER)
		pinMode(NEOPIXEL_POWER, OUTPUT);
		digitalWrite(NEOPIXEL_POWER, HIGH);
	#endif

	/*************************************************************************
	 * Setup the neopixel to track errors
	 *************************************************************************/
	  
	pixels.begin();
	pixels.setBrightness(10);
	pixels.fill(0xff0000);	// Colour Red
	pixels.show();
	delay(500);

	/*************************************************************************
	 * Setup Communication and Sensors
	 *************************************************************************/

	// Serial Communication - if debugging -----------------------------------

	#if defined(DEBUG) || defined(DEBUG_SENSOR)
		Serial.begin(115200);
		while (!Serial) delay(10);		// Wait for Serial startup
		Serial.println("Serial started");
	#endif

	// Wit-Motion WT901 AHRS Sensor ------------------------------------------

	if (!wt901.begin()) {
		#if defined(DEBUG)
			Serial.println("Error initializing WT901 sensor.");
		#endif
		while(1) delay(10);		// halt programe due to error with Sensor
	}
	#if defined (DEBUG)
		Serial.println("WT901 sensor initialized");
	#endif

	
	pixels.fill(0xffff00);	// Colour Orange
	pixels.show();
	delay(500);	

}

void loop() {
  // put your main code here, to run repeatedly:

}
