#include <Adafruit_NeoPixel.h>
#include <WitMotion.h>


class Adafruit_Sensor_Calibration {

public:
  //Adafruit_Sensor_Calibration(void);
  static uint16_t crc16_update(uint16_t crc, uint8_t a);

  bool hasEEPROM(void);
  bool hasFLASH(void);

  /*! @brief Overloaded calibration saving function
      @returns True if calibration was saved successfully */
  //virtual bool saveCalibration(void) = 0;
  /*! @brief Overloaded calibration loading function
      @returns True if calibration was loaded successfully */
  //virtual bool loadCalibration(void) = 0;
  /*! @brief Overloaded calibration printing function.
      @returns True if calibration was printed successfully */
  //virtual bool printSavedCalibration(void) = 0;
  bool calibrate(sensors_event_t &event);

  /**! XYZ vector of offsets for zero-g, in m/s^2 */
  float accel_zerog[3] = {0, 0, 0};

  /**! XYZ vector of offsets for zero-rate, in rad/s */
  float gyro_zerorate[3] = {0, 0, 0};

  /**! XYZ vector of offsets for hard iron calibration (in uT) */
  float mag_hardiron[3] = {0, 0, 0};

  /**! The 3x3 matrix for soft-iron calibration (unitless) */
  float mag_softiron[9] = {1, 0, 0, 0, 1, 0, 0, 0, 1};

  /**! The magnetic field magnitude in uTesla */
  float mag_field = 50;
} cal;

uint16_t crc16_update(uint16_t crc, uint8_t a);

#define NUMPIXELS 1			// 1 NeoPixel
//#define DEBUG				// Debugging if defined
#define CALIBRATION			// Calibration returned if defined - used for testing


WitMotion			wt901(&Wire);											// sensor Object
Adafruit_NeoPixel	pixels(NUMPIXELS, PIN_NEOPIXEL, NEO_GRB + NEO_KHZ800);	// pixels are wired GRB but colours are RGB

sensors_event_t	a, m, g;
int loopcount = 0;

//Adafruit_Sensor_Calibration cal;

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
		// Wait for data
		//while (!Serial.available()) delay(10); 	


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

	wt901.read();
	wt901.getEvent(&a, &m, &g);

	// 'Raw' values to match expectation of MotionCal
	Serial.print("Raw:");
	Serial.print(int(a.acceleration.x*8192/9.8)); Serial.print(",");
	Serial.print(int(a.acceleration.y*8192/9.8)); Serial.print(",");
	Serial.print(int(a.acceleration.z*8192/9.8)); Serial.print(",");
	Serial.print(int(g.gyro.x*SENSORS_RADS_TO_DPS*16)); Serial.print(",");
	Serial.print(int(g.gyro.y*SENSORS_RADS_TO_DPS*16)); Serial.print(",");
	Serial.print(int(g.gyro.z*SENSORS_RADS_TO_DPS*16)); Serial.print(",");
	Serial.print(int(m.magnetic.x*10)); Serial.print(",");
	Serial.print(int(m.magnetic.y*10)); Serial.print(",");
	Serial.print(int(m.magnetic.z*10)); Serial.println("");

	// unified data
	Serial.print("Uni:");
	Serial.print(a.acceleration.x); Serial.print(",");
	Serial.print(a.acceleration.y); Serial.print(",");
	Serial.print(a.acceleration.z); Serial.print(",");
	Serial.print(a.gyro.x, 4); Serial.print(",");
	Serial.print(g.gyro.y, 4); Serial.print(",");
	Serial.print(g.gyro.z, 4); Serial.print(",");
	Serial.print(m.magnetic.x); Serial.print(",");
	Serial.print(m.magnetic.y); Serial.print(",");
	Serial.print(m.magnetic.z); Serial.println("");

	loopcount++;
	#if defined(CALIBRATION)
		receiveCalibration();
	#endif
}

/********************************************************/

byte caldata[68]; // buffer to receive magnetic calibration data
byte calcount=0;

void receiveCalibration() {
  uint16_t crc;
  byte b, i;

  while (Serial.available()) {
    b = Serial.read();
    if (calcount == 0 && b != 117) {
      // first byte must be 117
      return;
    }
    if (calcount == 1 && b != 84) {
      // second byte must be 84
      calcount = 0;
      return;
    }
    // store this byte
    caldata[calcount++] = b;
    if (calcount < 68) {
      // full calibration message is 68 bytes
      return;
    }
    // verify the crc16 check
    crc = 0xFFFF;
    for (i=0; i < 68; i++) {
      crc = crc16_update(crc, caldata[i]);
    }
    if (crc == 0) {
      // data looks good, use it
      float offsets[16];
      memcpy(offsets, caldata+2, 16*4);
      cal.accel_zerog[0] = offsets[0];
      cal.accel_zerog[1] = offsets[1];
      cal.accel_zerog[2] = offsets[2];
      
      cal.gyro_zerorate[0] = offsets[3];
      cal.gyro_zerorate[1] = offsets[4];
      cal.gyro_zerorate[2] = offsets[5];
      
      cal.mag_hardiron[0] = offsets[6];
      cal.mag_hardiron[1] = offsets[7];
      cal.mag_hardiron[2] = offsets[8];

      cal.mag_field = offsets[9];
      
      cal.mag_softiron[0] = offsets[10];
      cal.mag_softiron[1] = offsets[13];
      cal.mag_softiron[2] = offsets[14];
      cal.mag_softiron[3] = offsets[13];
      cal.mag_softiron[4] = offsets[11];
      cal.mag_softiron[5] = offsets[15];
      cal.mag_softiron[6] = offsets[14];
      cal.mag_softiron[7] = offsets[15];
      cal.mag_softiron[8] = offsets[12];

      if (! true ){//cal.saveCalibration()) {
        Serial.println("**WARNING** Couldn't save calibration");
      } else {
        Serial.println("Wrote calibration");    
      }
      //cal.printSavedCalibration();
      calcount = 0;
      return;
    }
    // look for the 117,84 in the data, before discarding
    for (i=2; i < 67; i++) {
      if (caldata[i] == 117 && caldata[i+1] == 84) {
        // found possible start within data
        calcount = 68 - i;
        memmove(caldata, caldata + i, calcount);
        return;
      }
    }
    // look for 117 in last byte
    if (caldata[67] == 117) {
      caldata[0] = 117;
      calcount = 1;
    } else {
      calcount = 0;
    }
  }
}


uint16_t crc16_update(uint16_t crc, uint8_t a)
{
  int i;
  crc ^= a;
  for (i = 0; i < 8; i++) {
    if (crc & 1) {
      crc = (crc >> 1) ^ 0xA001;
    } else {
      crc = (crc >> 1);
    }
  }
  return crc;
}

