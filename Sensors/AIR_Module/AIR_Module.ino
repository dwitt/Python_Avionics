

/*****************************************************************************
 * AIR Module
 *****************************************************************************/

/*****************************************************************************
 * Boards used
 * Adafruit Feather RP2040
 * Adafruit CAN Bus FeatherWing
 * Custom Air FeatherWing
 *****************************************************************************/

#include <Wire.h>               // I2C library
#include <Adafruit_MCP2515.h>   // for CAN bus FeatherWing
#include <Adafruit_NeoPixel.h>  // for NeoPixel LED
#include <Adafruit_MAX31865.h>  // for MAX31865 RTD temperature sensor
#include "MS4525DO.h"           // MS4525DO Sensor Library
#include "SSC.h"                // SSC Sensor Library
#include "KalmanFilter.h"       // Kalman Filter Library
#include "RollingAverageInt.h"  // Rolling Average Library
#include "LowPassFilter.h"      // Low Pass Filter Library
#include "ButterworthLowPass.h" // Butterworth Low Pass Filter Library
#include "RollingAverageFilter.h" // Rolling Average Filter Library
#include "SmoothDeadband.h"      // Smooth Deadband Library
#include "DeadbandFilter.h"      // Deadband Filter Library

/*****************************************************************************
 * Defines to help with debugging
 ****************************************************************************/
//#define DEBUG

/*****************************************************************************
 * Create the objects using the libraries
 * Note: When using the Wire1 interface, the SDA and SCL pins must be set
 * to the GPIO8 and GPIO9 pins. But, the CAN Bus FeatherWing uses the GPIO8 
 * for its interrupt line. We are not using the interrupt line so we can cut 
 * the connection on the CAN Bus FeatherWing.
 *****************************************************************************/

#define MS45X5DO_PITOT_I2C_ADDRESS 0x28  // on the Wire interface i2c1
MS4525DO  ms4525do_pitot;

#define MS45X5DO_AOA_I2C_ADDRESS 0x28  // on the Wire1 interface i2c0
MS4525DO  ms4525do_aoa;

#define SSC_I2C_ADDRESS 0x78
SSC ssc;

// NeoPixel LED
#define LED_PIN 16
#define LED_COUNT 1
Adafruit_NeoPixel pixel(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// Kalman Filter (Q, R, P, X)
KalmanFilter pitotPressureKalman(10, 10, 10, 0);
KalmanFilter staticPressureKalman(1, 850000, 0, 1013.25);

// Rolling Average
RollingAverageInt staticPressureRollingAverage(50);
RollingAverageFilter staticPressureRollingAverageFilter(128, 256);

// Low Pass Filter
LowPassFilter StaticPressureLowPassFilter(0.01);
LowPassFilter PitotPressureLowPassFilter(0.04);

// Butterworth Low Pass Filter
ButterworthLowPass staticPressureButterworthLowPass;
ButterworthLowPass staticPressureButterworthLowPass2;
ButterworthLowPass pitotPressureButterworthLowPass; 

// Smooth Deadband
SmoothDeadband staticPressureSmoothDeadband(0.11, 0.7);
SmoothDeadband pitotPressureSmoothDeadband(0.1, 0.01);

// Deadband Filter
DeadbandFilter staticPressureDeadbandFilter(0.11, 0.7);
DeadbandFilter pitotPressureDeadbandFilter(0.12, 0.5);


// ----------------------------------------------------------------------------
// The MCP2515 (CAN Bus) uses the SPI interface
// ----------------------------------------------------------------------------

#define CAN_CS_PIN 7
#define CAN_BAUDRATE (250000)

Adafruit_MCP2515 can(CAN_CS_PIN);

// MAX31865 RTD temperature sensor (OAT) on SPI, separate CS pin
#define RTD_CS_PIN 24
#define RTD_NOMINAL 100.0       // PT100 nominal resistance
#define RTD_REF_RESISTOR 430.0  // Adafruit breakout reference resistor
Adafruit_MAX31865 rtd(RTD_CS_PIN);

// CAN Message Constants ------------------------------------------------------
#define CAN_AIR_MSG_ID    0x28
#define CAN_AOA_MSG_ID    0x29
#define CAN_TEMP_MSG_ID   0x2A
#define CAN_RAW_MSG_ID    0x2B
#define CAN_QNH_MSG_ID    0x2E

#define CAN_AIR_PERIOD    100 
#define CAN_AOA_PERIOD    200
#define CAN_TEMP_PERIOD   200
#define CAN_RAW_PERIOD    200

// ----------------------------------------------------------------------------
// Create Adafruit Sensor object pointers
// ----------------------------------------------------------------------------

Adafruit_Sensor *pitot_pressure, *pitot_temp, *aoa_pressure, *aoa_temp;
Adafruit_Sensor *static_pressure, *static_temp;

// ----------------------------------------------------------------------------
// Define locally global variables and functions
// ----------------------------------------------------------------------------
static uint32_t timestamp;      // tracking the timing in the main loop

// Timestamps to determine when to send the next CAN message
static long canAirTimeStamp = 0;
static long canAoaTimeStamp = 0;
static long canTempTimeStamp = 0;
static long canRawTimeStamp = 0;

// Data to send via CAN
// Declare static so they are local to this file

static int16_t airSpeed = 0;        // CANbus Data: knots
static int32_t altitude = 0;        // CANbus Data: feet
static int16_t verticalSpeed = 0;   // CANbus Data: feet/minute
static int16_t aoa = 0;             // CANbus Data: degrees
static int32_t staticPressure = 0;  // CANbus Data: hPa * 10
static int16_t staticTemp = 0;      // CANbus Data: degrees C * 10
static int16_t oatTemp = 0;         // CANbus Data: degrees C * 10 (from MAX31865 RTD)
static bool rtdAvailable = false;   // tracks whether RTD init succeeded
static int16_t pitotTemp = 0;       // CANbus Data: degrees C * 10
static int16_t pitotPressure = 0;   // CANbus Data: 

// Sensor data variables

static float sensorStaticPressure = 0;
static float sensorStaticTemp = 0;
static float sensorPitotTemp = 0;
static float sensorPitotPressure = 0;

// Data variables
static float previousStaticPressure = 0;  // hPa (100 Pa [kg/m/s^2])
static float staticPressureFiltered = 0;  // hPa (100 Pa [kg/m/s^2])
static float previousPitotPressure = 0;   // hPa (100 Pa [kg/m/s^2])
static float pitotPressureFiltered = 0;   // hPa (100 Pa [kg/m/s^2])
static float previousAOA = 0;
static float aoaFiltered = 0;            // degrees

static int16_t qnh = 2992;         // inHg * 100
static int16_t previous_qnh = qnh;

static float staticPressureLowPassFiltered = 0;

#define SEA_LEVEL_DENSITY_ISA 1.225   // kg/m^3
#define V_M_S_TO_KNOTS 1.9438444924406


/*****************************************************************************
 * Setup Code
 * 
 * Connect to all the Peripherals
 *****************************************************************************/

void setup() {

  pixel.begin();
  pixel.setBrightness(10);
  pixel.setPixelColor(0, pixel.Color(255, 0, 0));
  pixel.show();

  Serial.begin(115200);
  
  unsigned long startMillis = millis();
  while (!Serial && (millis() - startMillis) < 10000) {
    delay(100);
  }

  #if defined(DEBUG)
  if (Serial) {
    Serial.println("Debugging MS4525DO and SSC.");
  }
  #endif

  bool ms4525do_pitot_success, ms4525do_aoa_success, ssc_success, can_success;

  // --------------------------------------------------------------------------
  // Connect to the MS4525DO pitot static pressure sensor
  // Provide the address and the I2C interface to use.
  // --------------------------------------------------------------------------

  ms4525do_pitot_success = ms4525do_pitot.begin(MS45X5DO_PITOT_I2C_ADDRESS, &Wire);
  #if defined(DEBUG)
  if (!ms4525do_pitot_success && Serial)
    Serial.println("Could not find a valid MS4525DO pitot sensor.");
  #endif
  
  // --------------------------------------------------------------------------
  // Connect to the MS4525DO aoa  pressure sensor
  // Provide the address and the I2C interface to use.
  // The CAN Bus FeatherWing uses the GPIO8 for interrupt line, so the board
  // nees the trace to be cut otherwise it affects the I2C communication.
  // --------------------------------------------------------------------------

  Wire1.setSDA(8);  // GPIO8
  Wire1.setSCL(9);  // GPIO9

  ms4525do_aoa_success = ms4525do_aoa.begin(MS45X5DO_AOA_I2C_ADDRESS, &Wire1);
  #if defined(DEBUG)
  if (!ms4525do_aoa_success && Serial)
    Serial.println("Could not find a valid MS4525DO aoa sensor.");
  #endif

  // --------------------------------------------------------------------------
  // Connect to the SSC sensor
  // Provide the address and the I2C interface to use.
  // --------------------------------------------------------------------------

  ssc_success = ssc.begin(SSC_I2C_ADDRESS, &Wire);
  #if defined(DEBUG)
  if (!ssc_success && Serial)
    Serial.println("Could not find a valid SSC sensor.");
  #endif

	// -----------------------------------------------------------------------
	// Connect to the MCP2515 CAN Bus controller on the SPI bus
	// Provide the baud rate for the CAN Bus
	// -----------------------------------------------------------------------

	can_success = can.begin(CAN_BAUDRATE);
	#if defined(DEBUG)
	if (!can_success && Serial) Serial.println("Could not find CAN Bus MCP2515!");
	#endif

  // --------------------------------------------------------------------------
  // Connect to the MAX31865 RTD temperature sensor (OAT)
  // --------------------------------------------------------------------------

  rtdAvailable = rtd.begin(MAX31865_3WIRE);
  #if defined(DEBUG)
  if (!rtdAvailable && Serial) Serial.println("Could not find MAX31865 RTD sensor!");
  #endif

  // --------------------------------------------------------------------------
  // Make a stop or proceed decision based on whether we could connect
  // to all the sensors.
  // --------------------------------------------------------------------------

  if (!ms4525do_pitot_success || !ms4525do_aoa_success ||
     !ssc_success || !can_success || !rtdAvailable ) {
    #if defined(DEBUG)
    if (Serial) Serial.println("Startup failed.");
    #endif
    while (1) delay(100);   // wait for the user to reset the board
  }

  #if defined(DEBUG)
  if (Serial) Serial.println("All peripherals connected.");
  #endif

  pixel.setPixelColor(0, pixel.Color(0, 255, 0));
  pixel.show();

  /***************************************************************************
   * Configure the peripherals
   * Set the transfer functions/types and the pressure ranges
   ***************************************************************************/

  ms4525do_pitot.setOutputType(MS4525DO::MS4525DO_Type_A);
  ms4525do_aoa.setOutputType(MS4525DO::MS4525DO_Type_A);
  ssc.setTransferFunction(SSC::SSC_TF_A);

  ms4525do_pitot.setPressureRange(MS4525DO::MS4525DO_001);
  ms4525do_aoa.setPressureRange(MS4525DO::MS4525DO_001);
  ssc.setPressureRange(SSC::SSC_016BA);

  /***************************************************************************
   * Setup the sensors
   ***************************************************************************/

  pitot_pressure = ms4525do_pitot.getPressureSensor();
  pitot_temp = ms4525do_pitot.getTemperatureSensor();
  aoa_pressure = ms4525do_aoa.getPressureSensor();
  aoa_temp = ms4525do_aoa.getTemperatureSensor();
  static_pressure = ssc.getPressureSensor();
  static_temp = ssc.getTemperatureSensor();
  
  //---------------------------------------------------------------------------
  // Print the sensor details if debugging.
  // May block if the serial port is not connected.
  //---------------------------------------------------------------------------

  #if defined(DEBUG)
  pitot_pressure->printSensorDetails();
  pitot_temp->printSensorDetails();
  aoa_pressure->printSensorDetails();
  aoa_temp->printSensorDetails();
  static_pressure->printSensorDetails();
  static_temp->printSensorDetails();
  #endif

  /***************************************************************************
   * Set the I2C speed to 400 kHz
   ***************************************************************************/

  Wire.setClock(400000);
  Wire1.setClock(400000);

  /*************************************************************************** 
   * Configure the CAN bus filters to receive only the QNH message
   ***************************************************************************/

  // Maybe consider checking if the filter is set correctly using the return
  // value of the filter function.
  can.filter(CAN_QNH_MSG_ID, 0x7FF);

  timestamp = millis();     // initialize the timestamp

}

void loop() {
  // --------------------------------------------------------------------------
  // Define variables
  // --------------------------------------------------------------------------
  // Union for CAN data. Allow loading different data typs into various
  // parts of the CAN data message.
  // The union is declared as a static variable so it is not re-initialized
  // every time the loop runs.
  // The variable canData is initialized to an empty struct so that the
  // union is not initialized to random values.


  static union DataUnion 
  {
    int16_t integers[4];
    uint8_t bytes[8];
    float floats[2];
    struct __attribute__((packed)) {
      int16_t integer1;
      int32_t longInteger;
      int16_t integer2;
    } packedData;
  } canData =  {};

  // **************************************************************************
  // Send CAN Data
  // **************************************************************************

  // --------------------------------------------------------------------------
  // Send the Airspeed, Altitude and Vertical Speed data
  // --------------------------------------------------------------------------

  if (millis() - canAirTimeStamp > CAN_AIR_PERIOD + random(50)) {
    canData.packedData.integer1 = airSpeed;
    canData.packedData.longInteger = altitude;
    canData.packedData.integer2 = verticalSpeed;

    can.beginPacket(CAN_AIR_MSG_ID);
    can.write(canData.bytes, 8);
    can.endPacket();
    canAirTimeStamp = millis(); // update the timestamp
  }

  // --------------------------------------------------------------------------
  // Send the AOA data
  // --------------------------------------------------------------------------

  if (millis() - canAoaTimeStamp > CAN_AOA_PERIOD + random(50)) {
    canData.integers[0] = aoa;

    can.beginPacket(CAN_AOA_MSG_ID);
    can.write(canData.bytes, 8);
    can.endPacket();
    canAoaTimeStamp = millis(); // update the timestamp
  }

  // --------------------------------------------------------------------------
  // Send the Raw Static Pressure and Temperature data
  // --------------------------------------------------------------------------

  if (millis() - canRawTimeStamp > CAN_RAW_PERIOD + random(50)) {
    // Pack to match legacy format: <hbhBBB>
    // int16 static_pressure (hPa×10), int8 temperature (°C),
    // int16 differential_pressure (Pa), 3 bytes padding
    int16_t sp = (int16_t)(staticPressureFiltered * 10);  // hPa → hPa×10
    canData.bytes[0] = sp & 0xFF;
    canData.bytes[1] = (sp >> 8) & 0xFF;
    canData.bytes[2] = (uint8_t)((int8_t)sensorStaticTemp);  // whole °C
    int16_t diffP = (int16_t)(pitotPressureFiltered * 100);   // hPa → Pa
    canData.bytes[3] = diffP & 0xFF;
    canData.bytes[4] = (diffP >> 8) & 0xFF;
    canData.bytes[5] = 0;
    canData.bytes[6] = 0;
    canData.bytes[7] = 0;

    can.beginPacket(CAN_RAW_MSG_ID);
    can.write(canData.bytes, 8);
    can.endPacket();
    canRawTimeStamp = millis(); // update the timestamp
  }

  // --------------------------------------------------------------------------
  // Send the OAT (Outside Air Temperature) data from the MAX31865 RTD
  // --------------------------------------------------------------------------

  if (rtdAvailable && millis() - canTempTimeStamp > CAN_TEMP_PERIOD + random(50)) {
    canData.integers[0] = oatTemp;    // °C × 10 (int16, bytes 0-1)
    canData.bytes[2] = 0;             // Humidity % (not available)
    canData.bytes[3] = 0;
    canData.bytes[4] = 0;
    canData.bytes[5] = 0;
    canData.bytes[6] = 0;
    canData.bytes[7] = 0;

    can.beginPacket(CAN_TEMP_MSG_ID);
    can.write(canData.bytes, 8);
    can.endPacket();
    canTempTimeStamp = millis();
  }

  /***************************************************************************
   * Read the sensor data and update the variables
   ***************************************************************************/

  // --------------------------------------------------------------------------
  // Check if it is time to read the sensors
  // --------------------------------------------------------------------------

  if (millis() - timestamp > 10) {

    // ------------------------------------------------------------------------
    // Read the sensor data 
    // ------------------------------------------------------------------------

    sensors_event_t pitot_temp_event, pitot_pressure_event;
    sensors_event_t aoa_temp_event, aoa_pressure_event;
    sensors_event_t ssc_temp_event, ssc_pressure_event;

    pitot_temp->getEvent(&pitot_temp_event); 
    pitot_pressure->getEvent(&pitot_pressure_event);

    aoa_temp->getEvent(&aoa_temp_event);
    aoa_pressure->getEvent(&aoa_pressure_event);

    static_temp->getEvent(&ssc_temp_event);
    static_pressure->getEvent(&ssc_pressure_event);

    // ------------------------------------------------------------------------
    // Update and filter the data
    // ------------------------------------------------------------------------

    previousStaticPressure = sensorStaticPressure;
    sensorStaticPressure = ssc_pressure_event.pressure;
    staticPressureFiltered = StaticPressureLowPassFilter.update(sensorStaticPressure);
    //staticPressureFiltered = staticPressureButterworthLowPass.process(sensorStaticPressure);
    //staticPressureFiltered = staticPressureButterworthLowPass2.process(staticPressureFiltered);
    //staticPressureFiltered = staticPressureKalman.update(sensorStaticPressure);
    //staticPressureFiltered = staticPressureRollingAverage.update(sensorStaticPressure);
    //staticPressureFiltered = staticPressureRollingAverageFilter.update(sensorStaticPressure);
    staticPressureFiltered = staticPressureSmoothDeadband.update(staticPressureFiltered);


    

    previousPitotPressure = sensorPitotPressure;
    sensorPitotPressure = pitot_pressure_event.pressure;
    //pitotPressureFiltered = pitotPressureKalman.update(sensorPitotPressure);
    pitotPressureFiltered = PitotPressureLowPassFilter.update(sensorPitotPressure);
    pitotPressureFiltered = pitotPressureDeadbandFilter.update(pitotPressureFiltered);

    sensorStaticTemp = ssc_temp_event.temperature;

    // Read MAX31865 RTD temperature (OAT)
    // Must call temperature() first (triggers conversion), then check fault after
    if (rtdAvailable) {
      float oatC = rtd.temperature(RTD_NOMINAL, RTD_REF_RESISTOR);
      uint8_t fault = rtd.readFault();
      if (fault == 0) {
        oatTemp = (int16_t)(oatC * 10);  // °C × 10
      } else {
        rtd.clearFault();
      }
    }

    // ------------------------------------------------------------------------
    // Calculate the airspeed
    //
    // pitotPressure * 100.0 to convert to Pa (kg/m*s^2)
    // divided by SEA_LEVEL_DENSITY_ISA to convert to m^2/s^2
    // sqrt to get the speed in m/s
    // * V_M_S_TO_KNOTS to convert to knots
    // ------------------------------------------------------------------------

    if (pitotPressureFiltered > 0 ) {
      float speed = sqrt(2 * 
        abs(pitotPressureFiltered * 100.0) / SEA_LEVEL_DENSITY_ISA) * 
        V_M_S_TO_KNOTS;
      airSpeed = static_cast<int16_t>(speed);
    } else {
      airSpeed = 0;
    }

    // ------------------------------------------------------------------------
    // Calculate the altitude
    // ------------------------------------------------------------------------
    
    float height = 145442.16 * (
      pow(float(qnh) / 2992, 0.190263) - 
      pow(staticPressureFiltered / 1013.25, 0.190263));

    altitude = static_cast<int32_t>(height);

    // ------------------------------------------------------------------------
    // Update the timestamps
    // ------------------------------------------------------------------------

    timestamp = millis();     // keep track of when we last read the sensors

  }

  // **************************************************************************
  // Check for a QNH message on the CAN bus
  // **************************************************************************

  // try to parse packet
  int packetSize = can.parsePacket();

  if (packetSize) {
    // received a packet
    #if defined(DEBUG)
    Serial.print("Received CAN packet with id 0x");
    Serial.print(can.packetId(), HEX);
    Serial.print(" and length ");
    Serial.println(packetSize);
    #endif

    // Check if this is a QNH message
    if (can.packetId() == CAN_QNH_MSG_ID) {
      // Read the QNH data from the packet
      if (can.available() >= 4) {  // Check we have at least 4 bytes
        uint8_t qnhhPa_low = can.read();
        uint8_t qnhhPa_high = can.read();
        uint8_t qnhx4_low = can.read();
        uint8_t qnhx4_high = can.read();
        int16_t qnhx4 = (qnhx4_high << 8) | qnhx4_low; 
        
        // Convert from QNHx4 format to actual QNH (inHg)
        int16_t new_qnh = qnhx4 / 4;

        if (new_qnh != previous_qnh) {
          qnh = new_qnh;
          previous_qnh = qnh;
          #if defined(DEBUG)
          Serial.print("QNH updated to: ");
          Serial.println(qnh);
          #endif
        }
        
        // Read any remaining bytes to clear the packet
        while (can.available()) {
          can.read();
        }
      }
    } else {
      // This is NOT a QNH packet, but we must still read all bytes
      // We should not get any other packets, but just in case.
      while (can.available()) {
        can.read();  // Discard unwanted packet
      }
    }
  }

  #if defined(DEBUG)

  Serial.print("Altitude: ");
  Serial.println(altitude);
  // Serial.print("Static Pressure: ");
  // Serial.println(staticPressure);
  // Serial.print("Static Temp: ");
  // Serial.println(staticTemp);
  // Serial.print("Raw Pressure Count: ");
  // Serial.println(ssc.readRawPressureCount());
  // Serial.print("Pressure value: ");
  // Serial.println(ssc.readPressure());
  // Serial.print("Zero Count Offset: ");
  // Serial.println(ms4525do_pitot._pZeroCountOffset,HEX);

  // Serial.print("Speed: ");
  // Serial.print(airSpeed);
  // Serial.println(" knots");


  // Serial.print("Temperature: ");
  // Serial.print(pitot_temp_event.temperature);
  // Serial.println(" C");

  // Serial.print("Pressure: ");
  // Serial.print(pitot_pressure_event.pressure, 6);
  // Serial.println(" hPa");

  // Serial.print("SSC Pressure: ");
  // Serial.print(ssc_pressure_event.pressure, 6);
  // Serial.println(" hPa");
  // Serial.print("SSC Pressure: ");
  // Serial.print(ssc.readPressure()*.02952998301, 6);
  // Serial.println(" inHg");

  // Serial.print("SSC Temperature: ");
  // Serial.print(ssc_temp_event.temperature);
  // Serial.println(" C");


  // Serial.println();


  #endif
  //delay(10);
}
