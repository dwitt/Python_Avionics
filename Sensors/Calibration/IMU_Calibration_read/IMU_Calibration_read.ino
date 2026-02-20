/*****************************************************************************
 * IMU Calibration - based on Adafruit AHRS Calibration
 * Works with MotionCal to Calibrate the compass 
 *****************************************************************************/

/*****************************************************************************
 * Boards used
 * Adafruit Feather RP2040
 * Adafruit CAN Bus FeatherWing
 * Adafruit ISM330DHCX + LIS3MDL FeatherWing
 * Adafruit 24LC32 I2C EEPROM
 *****************************************************************************/

#include <Adafruit_ISM330DHCX.h>	// Only for ISM330DHCX
#include <Adafruit_LSM6DS.h>		// I2C Driver base for Adafruit LSM6DSxx sensors

// Remove the following includes once the the code is running.
//#include <Adafruit_LSM6DS3.h>			// Only for LSM6DS3
//#include <Adafruit_LSM6DS33.h>		// Only for LSM6DS33
//#include <Adafruit_LSM6DS3TRC.h>		// Only for LSM6DS3TRC
//#include <Adafruit_LSM6DSL.h>			// Only for LSM6DSL		
//#include <Adafruit_LSM6DSO32.h>		// Only for LSM6DSO32
//#include <Adafruit_LSM6DSOX.h>    	// Only for LSMDSOX

#include <Adafruit_LIS3MDL.h>		// For Magnetometer
#include <Adafruit_MCP2515.h>		// For CAN Bus FeatherWing
#include <Adafruit_EEPROM_I2C.h>	// EEPROM to hold calibration data

/*****************************************************************************
 * Include libraries for other functions
 *****************************************************************************/
//----------------------------------------------------------------------------
// Using a local copy of the sensor calibration library that has been modified
// to detect an Adafruit Feather RP2040 and use an EEPROM with this board
//----------------------------------------------------------------------------
#include <Sensor_Calibration.h>

//----------------------------------------------------------------------------
// Use the Adafruit AHRS library
// ---------------------------------------------------------------------------
#include <Adafruit_AHRS.h>

/*****************************************************************************
 * Defines to help with debugging     
 *****************************************************************************/
#define DEBUG

/*****************************************************************************
 * Create the objects using the libraries 
 *****************************************************************************/
//----------------------------------------------------------------------------
// The IMU uses the I2C bus
//----------------------------------------------------------------------------

#define ISM330DHCX_I2C_ADDRESS 	0x6A
#define LIS3MDL_I2C_ADDRESS		0x1C

Adafruit_ISM330DHCX ism330dhcx;
Adafruit_LIS3MDL lis3mdl;

//----------------------------------------------------------------------------
// The MCP2515 (CAN Bus) uses SPI
//----------------------------------------------------------------------------

#define CAN_CS_PIN 7
#define CAN_BAUDRATE (250000)

Adafruit_MCP2515 can(CAN_CS_PIN);

//----------------------------------------------------------------------------
// The Sensor Calibration EEPROM uses the I2C bus for calibration
// The I2C bus is on the Wire interface of the Feather RP2040
//----------------------------------------------------------------------------

#define EEPROM_I2C_ADDRESS	(0X50)

Sensor_Calibration_EEPROM cal(EEPROM_I2C_ADDRESS, &Wire);	// Wire speed set
															// at end of setup

//----------------------------------------------------------------------------
// Create Adafruit Sensor object pointers
//----------------------------------------------------------------------------
Adafruit_Sensor *accelerometer, *gyroscope, *magnetometer;

// THIS SECTION IS FOR THE FUSION/IMU ROUTINE - IT CAN BE REMOVED
//----------------------------------------------------------------------------
// Create the filter object based on the method to be used for fusing the
// sensor data. Uncomment only one of the filters
//----------------------------------------------------------------------------
//Adafruit_NXPSensorFusion filter; 	// slowest
//Adafruit_Madgwick filter;  		// faster than NXP
//Adafruit_Mahony filter;  			// fastest/smalleset

//----------------------------------------------------------------------------
// Define global variables
// ---------------------------------------------------------------------------
sensors_event_t mag_event, gyro_event, accel_event;	// sensor event (data)
int loopcount = 0;									// counter in main loop

/*****************************************************************************
 * Setup Code 
 *
 * Connect to all of the Peripherals
 *****************************************************************************/

void setup() {

	Serial.begin(115200);
	
	// Add a timeout for interactive features
	unsigned long startMillis = millis();
	while (!Serial && (millis() - startMillis < 10000)) {
		// Wait up to 3 seconds for USB Serial connection
		delay(100);
	}

	#if defined(DEBUG)
	if (Serial) {
		Serial.println("Debugging ISM330DHCX, LIS3MDL and MCP2515.");
	}
	#endif

	bool ism330dhcx_success, lis3mdl_success, can_success, eeprom_success;
	//int can_success;

	// -----------------------------------------------------------------------
	// Connect to the ISM330DHCX
	// Provide the address and the I2C interface to use.
	// When using the Earle Philhower core:
	// Wire is I2C1 on the RP2040
	// Wire1 is I2C0 on the RP2040
	// Wire speed set at end of setup
	// -----------------------------------------------------------------------

	ism330dhcx_success = ism330dhcx.begin_I2C(ISM330DHCX_I2C_ADDRESS, &Wire);
	#if defined(DEBUG)
	if (!ism330dhcx_success && Serial) Serial.println("Could not find ISM330DHCX!");
	#endif

	// -----------------------------------------------------------------------
	// Connect to the LIS3MDL
	// Provide the address and the I2C interface to use.
	// When using the Earle Philhower core:
	// Wire is I2C1 on the RP2040
	// Wire1 is I2C0 on the RP2040
	// Wire speed set at end of setup
	// -----------------------------------------------------------------------

	lis3mdl_success = lis3mdl.begin_I2C(LIS3MDL_I2C_ADDRESS, &Wire);
	#if defined(DEBUG)
	if (!lis3mdl_success && Serial) Serial.println("Could not find LIS3MDL!");
	#endif

	// -----------------------------------------------------------------------
	// Connect to the MCP2515 CAN Bus controller on the SPI bus
	// Provide the baud rate for the CAN Bus
	// -----------------------------------------------------------------------

	can_success = can.begin(CAN_BAUDRATE);
	#if defined(DEBUG)
	if (!can_success && Serial) Serial.println("Could not find CAN Bus MCP2515!");
	#endif


	// -----------------------------------------------------------------------
	// Make a stop or proceed decision based on whether we could connect
	// to all of the devices

	if (!(ism330dhcx_success && lis3mdl_success && can_success )) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Startup failed.");
		#endif
		while(true){	// stop in while loop forever
			delay(10);
		}
	}

	#if defined(DEBUG)
	if (Serial) Serial.println("All peripherals connected.");
	#endif

	// -----------------------------------------------------------------------
	// Connect to the EEPROM

	if (!cal.begin()) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Failed to initialize the calibration helper");
		#endif
		while(true) {
			yield();
			delay(10);
		}
	}

	if (!cal.loadCalibration()) {
		#if defined(DEBUG)
    	if (Serial) Serial.println("**WARNING** No calibration loaded/found");
		#endif
  	}
  	cal.printSavedCalibration();

	Serial.println("Calibrations found: ");
	Serial.print("\tMagnetic Hard Offset: ");
	for (int i=0; i<3; i++) {
		Serial.print(cal.mag_hardiron[i]); 
		if (i != 2) Serial.print(", ");
	}
	Serial.println();
	
	Serial.print("\tMagnetic Soft Offset: ");
	for (int i=0; i<9; i++) {
		Serial.print(cal.mag_softiron[i]); 
		if (i != 8) Serial.print(", ");
	}
	Serial.println();

	Serial.print("\tMagnetic Field Magnitude: ");
	Serial.println(cal.mag_field);

	Serial.print("\tGyro Zero Rate Offset: ");
	for (int i=0; i<3; i++) {
		Serial.print(cal.gyro_zerorate[i]); 
		if (i != 2) Serial.print(", ");
	}
	Serial.println();

	Serial.print("\tAccel Zero G Offset: ");
	for (int i=0; i<3; i++) {
		Serial.print(cal.accel_zerog[i]); 
		if (i != 2) Serial.print(", ");
	}
	Serial.println();

	/*************************************************************************
	 * Configure the peripherals                          
	 *************************************************************************/

	// -----------------------------------------------------------------------
	// Set the Accelerometer and Gyro (ISM330DHCX) ranges and data rates
	// Note: The library is based on LSM6DS and the constants use this for
	//       a prefix despite the fact that we are configuring the ISM330DHCX
	// -----------------------------------------------------------------------
	// -----------------------------------------------------------------------
	// Set the Magnetometer (LIS3MDL) ranges, data rates and modes
	// -----------------------------------------------------------------------

	// Note: The accelerometer data range is set to 4G instead of 2G as in 
	// the Adafruit Calibration routine. This sectionm is effectively the 
	// setup_sensors(void) method.

	#define ACCEL_RANGE LSM6DS_ACCEL_RANGE_4_G			// +/- 4G
	#define GYRO_RANGE LSM6DS_GYRO_RANGE_250_DPS		// 250 degrees/sec
	#define MAG_RANGE LIS3MDL_RANGE_4_GAUSS				// 4 Gauss
	
	#define ACCEL_DATA_RATE LSM6DS_RATE_104_HZ			// 104 Hz
	#define GYRO_DATA_RATE LSM6DS_RATE_104_HZ			// 104 Hz
	#define MAG_DATA_RATE LIS3MDL_DATARATE_1000_HZ		// 1000 Hz

	#define MAG_POWER_MODE LIS3MDL_MEDIUMMODE			// Medium Power
	#define MAG_OPERATION_MODE LIS3MDL_CONTINUOUSMODE	// Continuous
	
	// -----------------------------------------------------------------------
	// Set the ISM330DHCX acceleraometer range
	// -----------------------------------------------------------------------
	lsm6ds_accel_range_t accel_range;

	ism330dhcx.setAccelRange(ACCEL_RANGE);
	accel_range = ism330dhcx.getAccelRange();
	if (accel_range != ACCEL_RANGE) {
		#if defined(DEBUG)
		if (Serial)	Serial.println("Unable to set acceleration range in ISM330DHCX.");
		#endif
		while(true) {
			delay(10);
		}
	}

	// -----------------------------------------------------------------------
	// Set the ISM330DHCX acceleraometer data rate
	// -----------------------------------------------------------------------
	lsm6ds_data_rate_t accel_data_rate;

	ism330dhcx.setAccelDataRate(ACCEL_DATA_RATE);
	accel_data_rate = ism330dhcx.getAccelDataRate();
	if (accel_data_rate != ACCEL_DATA_RATE) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Unable to set acceleration data rate in ISM330DHCX.");
		#endif
		while(true) {
			delay(10);
		}
	}

	// -----------------------------------------------------------------------
	// Set the ISM330DHCX gyro range
	// -----------------------------------------------------------------------
	lsm6ds_gyro_range_t gyro_range;

	ism330dhcx.setGyroRange(GYRO_RANGE);
	gyro_range = ism330dhcx.getGyroRange();
	if (gyro_range != GYRO_RANGE) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Unable to set gyro range in ISM330DHCX.");
		#endif
		while(true) {
			delay(10);
		}
	}

	// -----------------------------------------------------------------------
	// Set the ISM330DHCX gyro data rate
	// -----------------------------------------------------------------------
	lsm6ds_data_rate_t gyro_data_rate;

	ism330dhcx.setGyroDataRate(GYRO_DATA_RATE);
	gyro_data_rate = ism330dhcx.getGyroDataRate();
	if (gyro_data_rate != GYRO_DATA_RATE) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Unable to set GYRO data rate in ISM330DHCX.");
		#endif
		while(true) {
			delay(10);
		}
	}

	// -----------------------------------------------------------------------
	// Set the LIS3MDL range
	// -----------------------------------------------------------------------
	lis3mdl_range_t magnetometer_range;

	lis3mdl.setRange(MAG_RANGE);
	magnetometer_range = lis3mdl.getRange();
	if (magnetometer_range != MAG_RANGE) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Unable to set Magnetometer data range in LIS3MDL.");
		#endif
		while(true) {
			delay(10);
		}
	}

	// -----------------------------------------------------------------------
	// Set the LIS3MDL data rate
	// -----------------------------------------------------------------------
	lis3mdl_dataRate_t magnetometer_data_rate;

	lis3mdl.setDataRate(MAG_DATA_RATE);
	magnetometer_data_rate = lis3mdl.getDataRate();
	if (magnetometer_data_rate != MAG_DATA_RATE) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Unable to set Magnetometer data rate in LIS3MDL.");
		#endif
		while(true) {
			delay(10);
		}
	}

	// -----------------------------------------------------------------------
	// Set the LIS3MDL power/performance mode
	// -----------------------------------------------------------------------
	lis3mdl_performancemode_t magnetometer_performance_mode;

	lis3mdl.setPerformanceMode(MAG_POWER_MODE);
	magnetometer_performance_mode = lis3mdl.getPerformanceMode();
	if (magnetometer_performance_mode != MAG_POWER_MODE) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Unable to set Magnetometer power mode in LIS3MDL.");
		#endif
		while(true) {
			delay(10);
		}
	}	

	// -----------------------------------------------------------------------
	// Set the LIS3MDL operation mode
	// -----------------------------------------------------------------------
	lis3mdl_operationmode_t magnetometer_operation_mode;

	lis3mdl.setOperationMode(MAG_OPERATION_MODE);
	magnetometer_operation_mode = lis3mdl.getOperationMode();
	if (magnetometer_operation_mode != MAG_OPERATION_MODE) {
		#if defined(DEBUG)
		if (Serial) Serial.println("Unable to set Magnetometer operation mode in LIS3MDL.");
		#endif
		while(true) {
			delay(10);
		}
	}

	/*************************************************************************
	 * Setup Sensors                       
	 *************************************************************************/
	// The following 3 lines are equivalent to the init_sensors(void) function 
	accelerometer = ism330dhcx.getAccelerometerSensor();
	gyroscope = ism330dhcx.getGyroSensor();
	magnetometer = &lis3mdl;

	accelerometer->printSensorDetails();
	gyroscope->printSensorDetails();
	magnetometer->printSensorDetails();	

	/*************************************************************************
	 * Set the I2C speed
	 *************************************************************************/

	Wire.setClock(400000);		// 400 kHz

}

void loop() {
//   // get the sensor data
//   magnetometer->getEvent(&mag_event);
//   gyroscope->getEvent(&gyro_event);
//   accelerometer->getEvent(&accel_event);
  
//   // 'Raw' values to match expectation of MotionCal
//   Serial.print("Raw:");
//   Serial.print(int(round(accel_event.acceleration.x*8192/9.8))); Serial.print(",");
//   Serial.print(int(round(accel_event.acceleration.y*8192/9.8))); Serial.print(",");
//   Serial.print(int(round(accel_event.acceleration.z*8192/9.8))); Serial.print(",");
//   Serial.print(int(round(gyro_event.gyro.x*SENSORS_RADS_TO_DPS*16))); Serial.print(",");
//   Serial.print(int(round(gyro_event.gyro.y*SENSORS_RADS_TO_DPS*16))); Serial.print(",");
//   Serial.print(int(round(gyro_event.gyro.z*SENSORS_RADS_TO_DPS*16))); Serial.print(",");
//   Serial.print(int(round(mag_event.magnetic.x*10))); Serial.print(",");
//   Serial.print(int(round(mag_event.magnetic.y*10))); Serial.print(",");
//   Serial.print(int(round(mag_event.magnetic.z*10))); Serial.println("");

//   // unified data
//   Serial.print("Uni:");
//   Serial.print(accel_event.acceleration.x); Serial.print(",");
//   Serial.print(accel_event.acceleration.y); Serial.print(",");
//   Serial.print(accel_event.acceleration.z); Serial.print(",");
//   Serial.print(gyro_event.gyro.x, 4); Serial.print(",");
//   Serial.print(gyro_event.gyro.y, 4); Serial.print(",");
//   Serial.print(gyro_event.gyro.z, 4); Serial.print(",");
//   Serial.print(mag_event.magnetic.x); Serial.print(",");
//   Serial.print(mag_event.magnetic.y); Serial.print(",");
//   Serial.print(mag_event.magnetic.z); Serial.println("");
  
//   loopcount++;
//   receiveCalibration();

//   // occasionally print calibration
//   if (loopcount == 50 || loopcount > 100) {
//     Serial.print("Cal1:");
//     for (int i=0; i<3; i++) {
//       Serial.print(cal.accel_zerog[i], 3); 
//       Serial.print(",");
//     }
//     for (int i=0; i<3; i++) {
//       Serial.print(cal.gyro_zerorate[i], 3);
//       Serial.print(",");
//     }  
//     for (int i=0; i<3; i++) {
//       Serial.print(cal.mag_hardiron[i], 3); 
//       Serial.print(",");
//     }  
//     Serial.println(cal.mag_field, 3);
//     loopcount++;
//   }
//   if (loopcount >= 100) {
//     Serial.print("Cal2:");
//     for (int i=0; i<9; i++) {
//       Serial.print(cal.mag_softiron[i], 4); 
//       if (i < 8) Serial.print(',');
//     }
//     Serial.println();
//     loopcount = 0;
//   }

//   delay(10);
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

      if (! cal.saveCalibration()) {
        Serial.println("**WARNING** Couldn't save calibration");
      } else {
        Serial.println("Wrote calibration");    
      }
      cal.printSavedCalibration();
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

