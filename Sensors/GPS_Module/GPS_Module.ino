

/*****************************************************************************
 * GPS Module
 *****************************************************************************/

/*****************************************************************************
 * Boards used
 * Adafruit Feather RP2040
 * Adafruit CAN Bus FeatherWing
 * Adafruit Ultimate GPS Breakout (66 channel, 10 Hz)
 *****************************************************************************/

#include <Adafruit_GPS.h>        // Adafruit GPS NMEA parsing library
#include <Adafruit_MCP2515.h>    // for CAN Bus FeatherWing
#include <Adafruit_NeoPixel.h>   // for NeoPixel LED
#include "XYZgeomag.hpp"         // WMM2025 magnetic declination (nhz2/XYZgeomag)

/*****************************************************************************
 * Defines to help with debugging
 ****************************************************************************/
// #define DEBUG
// #define DEBUG_NO_CAN    // Skip CAN bus, output messages to Serial instead

// ----------------------------------------------------------------------------
// GPS uses Serial1 (hardware UART on Feather RP2040)
// TX = GPIO0, RX = GPIO1
// ----------------------------------------------------------------------------

#define GPS_BAUD_INITIAL  9600
#define GPS_BAUD_FAST     115200

Adafruit_GPS gps(&Serial1);

// ----------------------------------------------------------------------------
// NeoPixel LED
// ----------------------------------------------------------------------------

#define LED_PIN   16
#define LED_COUNT 1
Adafruit_NeoPixel pixel(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// ----------------------------------------------------------------------------
// The MCP2515 (CAN Bus) uses the SPI interface
// ----------------------------------------------------------------------------

#define CAN_CS_PIN 7
#define CAN_BAUDRATE (250000)

Adafruit_MCP2515 can(CAN_CS_PIN);

// CAN Message Constants ------------------------------------------------------
#define CAN_GPS1_MSG_ID       0x63
#define CAN_GPS2_MSG_ID       0x64
#define CAN_GPS3_MSG_ID       0x65
#define CAN_TIME_SYNC_MSG_ID  0x19

#define CAN_GPS1_PERIOD       1000    // milliseconds
#define CAN_GPS2_PERIOD       1000    // milliseconds
#define CAN_GPS3_PERIOD       1000    // milliseconds
#define CAN_TIME_SYNC_PERIOD  1000    // milliseconds

// ----------------------------------------------------------------------------
// Conversion Constants
// ----------------------------------------------------------------------------

#define M_TO_FT 3.28084f
#define TRACK_SPEED_THRESHOLD 2  // knots - hold track to 0 below this speed

// ----------------------------------------------------------------------------
// Define locally global variables and functions
// ----------------------------------------------------------------------------

// Timestamps to determine when to send the next CAN message
static long canGps1TimeStamp = 0;
static long canGps2TimeStamp = 0;
static long canGps3TimeStamp = 0;
static long canTimeSyncTimeStamp = 0;

// Data to send via CAN
// Declare static so they are local to this file

static int32_t latitude = 0;         // CANbus Data: degrees * 1,000,000
static int32_t longitude = 0;        // CANbus Data: degrees * 1,000,000
static int16_t groundSpeed = 0;      // CANbus Data: knots
static int16_t gpsAltitude = 0;      // CANbus Data: feet
static int16_t trueTrack = 0;        // CANbus Data: degrees
static int16_t trackMag = 0;         // CANbus Data: degrees
static float   magDeclination = 0;  // Magnetic declination from WMM2025 (East +, West -)

// Time data
static uint8_t gpsYear = 0;
static uint8_t gpsMonth = 0;
static uint8_t gpsDay = 0;
static uint8_t gpsHour = 0;
static uint8_t gpsMinute = 0;
static uint8_t gpsSecond = 0;

static bool gpsHasDate = false;

static unsigned long lastWmmCompute = 0;
#define WMM_COMPUTE_INTERVAL 60000  // Recompute magnetic declination every 60 seconds

// ----------------------------------------------------------------------------
// Convert GPS date/time to a decimal year for WMM calculations.
// Approximate: each month = 1/12 year, each day = 1/365 year.
// ----------------------------------------------------------------------------
float gpsDecimalYear(uint8_t year2d, uint8_t month, uint8_t day) {
  float yr = 2000.0f + year2d;
  yr += (month - 1) / 12.0f;
  yr += (day - 1) / 365.0f;
  return yr;
}

// ----------------------------------------------------------------------------
// Compute magnetic declination using the WMM2025 model.
// Uses GPS latitude, longitude (degrees), altitude (metres), and date.
// Returns declination in degrees (East positive, West negative).
// ----------------------------------------------------------------------------
float computeMagDeclination(float lat, float lon, float altMetres,
                            uint8_t year2d, uint8_t month, uint8_t day) {
  float dyear = gpsDecimalYear(year2d, month, day);
  geomag::Vector pos = geomag::geodetic2ecef(lat, lon, altMetres);
  geomag::Vector mag = geomag::GeoMag(dyear, pos, geomag::WMM2025);
  geomag::Elements elem = geomag::magField2Elements(mag, lat, lon);
  return elem.declination;
}

// ----------------------------------------------------------------------------
// Helper to print a CAN message to Serial (used when DEBUG_NO_CAN is defined)
// ----------------------------------------------------------------------------
#if defined(DEBUG_NO_CAN)
void serialPrintCANMsg(uint16_t id, uint8_t *data, uint8_t len) {
  Serial.print("CAN 0x");
  Serial.print(id, HEX);
  Serial.print(" [");
  Serial.print(len);
  Serial.print("] ");
  for (uint8_t i = 0; i < len; i++) {
    if (data[i] < 0x10) Serial.print("0");
    Serial.print(data[i], HEX);
    if (i < len - 1) Serial.print(" ");
  }
  Serial.println();
}
#endif


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
    Serial.println("GPS Module starting...");
  }
  #endif

  bool gps_success, can_success;

  // --------------------------------------------------------------------------
  // Connect to the GPS module
  // Start at 9600 baud (GPS default), then switch to 115200
  // --------------------------------------------------------------------------

  Serial1.begin(GPS_BAUD_INITIAL);
  gps.begin(GPS_BAUD_INITIAL);

  // Send command to GPS to change its baud rate to 115200
  gps.sendCommand(PMTK_SET_BAUD_115200);
  delay(500);

  // Reinitialize Serial1 at the new baud rate
  Serial1.end();
  Serial1.begin(GPS_BAUD_FAST);
  gps.begin(GPS_BAUD_FAST);

  // --------------------------------------------------------------------------
  // Configure the GPS NMEA output
  // Enable RMC, GGA, and GSA sentences
  //                          A B C D E F G H                   I
  // PMTK314,                 0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0
  //
  // A - send GLL - Geographic Position - Latitude/Longitude
  // B - send RMC - Recommended Minimum Navigation Information
  // C - send VTG - Track made good and Ground Speed
  // D - send GGA - Global Positioning System Fix Data
  // E - send GSA - GPS DOP and active satellites
  // F - send GSV - Satellites in view
  // G - send GRS - GPS Range Residuals
  // H - send GST - GPS Pseudorange Noise Statistics
  // I - send ZDA - Time & Date
  // --------------------------------------------------------------------------

  // Enable RMC, GGA, and GSA sentences
  gps.sendCommand("$PMTK314,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29");
  delay(100);

  // Set the NMEA update rate to 1 Hz (1000 ms)
  gps.sendCommand(PMTK_SET_NMEA_UPDATE_1HZ);
  delay(100);

  // Enable SBAS/WAAS for improved accuracy (especially vertical)
  gps.sendCommand(PMTK_ENABLE_SBAS);
  delay(100);
  gps.sendCommand(PMTK_ENABLE_WAAS);

  gps_success = true;  // GPS is fire-and-forget on UART, no handshake

  // --------------------------------------------------------------------------
  // Connect to the CAN Bus
  // --------------------------------------------------------------------------

  #if defined(DEBUG_NO_CAN)
  can_success = true;  // Skip CAN init for serial-only debugging
  if (Serial) {
    Serial.println("DEBUG_NO_CAN: CAN bus skipped, output to Serial.");
  }
  #else
  can_success = can.begin(CAN_BAUDRATE);
  #endif

  #if defined(DEBUG)
  if (Serial) {
    if (!can_success) Serial.println("CAN bus init failed!");
    Serial.println("GPS Module setup complete.");
  }
  #endif

  // --------------------------------------------------------------------------
  // Go / No-Go decision
  // --------------------------------------------------------------------------

  if (gps_success && can_success) {
    pixel.setPixelColor(0, pixel.Color(0, 255, 0));
    pixel.show();
  } else {
    // Flash red LED to indicate failure
    while (1) {
      pixel.setPixelColor(0, pixel.Color(255, 0, 0));
      pixel.show();
      delay(500);
      pixel.setPixelColor(0, pixel.Color(0, 0, 0));
      pixel.show();
      delay(500);
    }
  }
}


/*****************************************************************************
 * Main Loop
 *
 * Tasks:
 * 1. Read and parse GPS NMEA data
 * 2. Update GPS data variables
 * 3. Transmit CAN data for GPS position, speed/alt, and time sync
 *****************************************************************************/

void loop() {

  // --------------------------------------------------------------------------
  // Define variables
  // --------------------------------------------------------------------------
  // Unions for CAN data. Allow loading different data types into various
  // parts of the CAN data message.
  // The unions are declared as static variables so they are not re-initialized
  // every time the loop runs.

  // GPS1 message: 2 x int32_t (latitude, longitude)
  static union {
    int32_t longs[2];
    uint8_t bytes[8];
  } canGps1Data = {};

  // GPS2 message: 4 x int16_t (speed, altitude, track, mag track)
  static union {
    int16_t integers[4];
    uint8_t bytes[8];
  } canGps2Data = {};

  // GPS3 message: GPS status (fixquality, fix3d, sats, reserved, HDOP, VDOP)
  static uint8_t canGps3Data[8] = {};

  // Time Sync message: 8 x uint8_t
  static uint8_t canTimeSyncData[8] = {};

  // --------------------------------------------------------------------------
  // Read and parse GPS data
  // --------------------------------------------------------------------------
  // Drain the serial buffer by reading all available characters each loop.
  // gps.read() processes one character at a time; without this loop the
  // buffer overflows when the rest of the loop is slow (e.g. WMM math).

  while (Serial1.available()) {
    gps.read();
  }

  if (gps.newNMEAreceived()) {
    #if defined(DEBUG)
    static unsigned long lastNmeaDebug = 0;
    bool printNmea = (millis() - lastNmeaDebug > 5000);
    if (printNmea && Serial) {
      Serial.print("NMEA: ");
      Serial.print(gps.lastNMEA());
    }
    #endif
    gps.parse(gps.lastNMEA());
    #if defined(DEBUG)
    if (printNmea && Serial) {
      Serial.print("  fix="); Serial.print(gps.fix);
      Serial.print(" qual="); Serial.print(gps.fixquality);
      Serial.print(" sat="); Serial.print((int)gps.satellites);
      Serial.print(" date="); Serial.print(gps.month);
      Serial.print("/"); Serial.print(gps.day);
      Serial.print("/"); Serial.print(gps.year);
      Serial.print(" time="); Serial.print(gps.hour);
      Serial.print(":"); Serial.print(gps.minute);
      Serial.print(":"); Serial.println(gps.seconds);
      lastNmeaDebug = millis();
    }
    #endif
  }

  // --------------------------------------------------------------------------
  // Update GPS data variables when we have a fix
  // --------------------------------------------------------------------------

  if (gps.fix) {

    // Get latitude and longitude in decimal degrees
    // Multiply by 1,000,000 to capture 6 decimal places
    // 4-byte int32_t holds 9 significant digits without loss
    // 6 decimal places = accuracy to 0.01" (seconds of arc)

    latitude = (int32_t)(gps.latitudeDegrees * 1000000.0f);
    longitude = (int32_t)(gps.longitudeDegrees * 1000000.0f);

    if (gps.speed >= 0) {
      groundSpeed = (int16_t)gps.speed;           // knots
    }

    if (gps.altitude > -9999) {
      gpsAltitude = (int16_t)(gps.altitude * M_TO_FT);  // metres -> feet
    }

    // Update time data
    gpsHour = gps.hour;
    gpsMinute = gps.minute;
    gpsSecond = gps.seconds;

    uint16_t fullYear = gps.year;  // Adafruit GPS library returns 2-digit year
    if (fullYear > 255) {
      fullYear = fullYear - 2000;
    }
    gpsYear = (uint8_t)fullYear;
    gpsMonth = gps.month;
    gpsDay = gps.day;

    if (gpsMonth > 0 && gpsDay > 0) {
      gpsHasDate = true;
    }

    // Compute magnetic declination from WMM2025 (throttled — declination
    // changes negligibly over minutes, but the computation is expensive on
    // the M0+ with no hardware FPU and was starving the serial buffer)
    if (gpsHasDate && (millis() - lastWmmCompute > WMM_COMPUTE_INTERVAL)) {
      magDeclination = computeMagDeclination(
        gps.latitudeDegrees, gps.longitudeDegrees, gps.altitude,
        gpsYear, gpsMonth, gpsDay);
      lastWmmCompute = millis();
    }

    if (gps.angle >= 0 && gps.speed >= TRACK_SPEED_THRESHOLD) {
      trueTrack = (int16_t)gps.angle;             // degrees true

      // Calculate magnetic track from true track and WMM declination
      // Magnetic heading = True heading - Declination (East +, West -)
      float magTrack = gps.angle - magDeclination;
      if (magTrack < 0) magTrack += 360.0f;
      if (magTrack >= 360.0f) magTrack -= 360.0f;
      trackMag = (int16_t)magTrack;
    } else if (gps.speed < TRACK_SPEED_THRESHOLD) {
      trueTrack = 0;                              // no meaningful track when stationary
      trackMag = 0;
    }
  }

  // **************************************************************************
  // Send CAN Data
  // Only send GPS data when we have a valid fix (matches Python behaviour)
  // **************************************************************************

  if (gps.fix) {

    // --------------------------------------------------------------------------
    // Send the GPS Coordinates (latitude, longitude)
    // --------------------------------------------------------------------------

    if (millis() - canGps1TimeStamp > CAN_GPS1_PERIOD + random(50)) {
      canGps1Data.longs[0] = latitude;
      canGps1Data.longs[1] = longitude;

      #if defined(DEBUG_NO_CAN)
      serialPrintCANMsg(CAN_GPS1_MSG_ID, canGps1Data.bytes, 8);
      #else
      can.beginPacket(CAN_GPS1_MSG_ID);
      can.write(canGps1Data.bytes, 8);
      can.endPacket();
      #endif
      canGps1TimeStamp = millis();
    }

    // --------------------------------------------------------------------------
    // Send the GPS Speed, Altitude, and True Track
    // --------------------------------------------------------------------------

    if (millis() - canGps2TimeStamp > CAN_GPS2_PERIOD + random(50)) {
      canGps2Data.integers[0] = groundSpeed;
      canGps2Data.integers[1] = gpsAltitude;
      canGps2Data.integers[2] = trueTrack;
      canGps2Data.integers[3] = trackMag;

      #if defined(DEBUG_NO_CAN)
      serialPrintCANMsg(CAN_GPS2_MSG_ID, canGps2Data.bytes, 8);
      #else
      can.beginPacket(CAN_GPS2_MSG_ID);
      can.write(canGps2Data.bytes, 8);
      can.endPacket();
      #endif
      canGps2TimeStamp = millis();

      #if defined(DEBUG)
      if (Serial) {
        Serial.print("lat = "); Serial.print(latitude);
        Serial.print(", lon = "); Serial.print(longitude);
        Serial.print(", spd = "); Serial.print(groundSpeed);
        Serial.print(", alt = "); Serial.print(gpsAltitude);
        Serial.print(", trk = "); Serial.print(trueTrack);
        Serial.print(", mag = "); Serial.print(trackMag);
        Serial.print(", dec = "); Serial.print(magDeclination);
        Serial.print(", hasDate = "); Serial.println(gpsHasDate);
      }
      #endif
    }

    // --------------------------------------------------------------------------
    // Send the Time Sync data
    // --------------------------------------------------------------------------

    if (millis() - canTimeSyncTimeStamp > CAN_TIME_SYNC_PERIOD + random(50)) {

      if (gpsHasDate) {

        #if defined(DEBUG)
        if (Serial) {
          Serial.print(gpsYear); Serial.print("/");
          Serial.print(gpsMonth); Serial.print("/");
          Serial.print(gpsDay); Serial.print(" ");
          Serial.print(gpsHour); Serial.print(":");
          Serial.print(gpsMinute); Serial.print(":");
          Serial.println(gpsSecond);
        }
        #endif
        canTimeSyncData[0] = gpsYear;
        canTimeSyncData[1] = gpsMonth;
        canTimeSyncData[2] = gpsDay;
        canTimeSyncData[3] = gpsHour;
        canTimeSyncData[4] = gpsMinute;
        canTimeSyncData[5] = gpsSecond;
        canTimeSyncData[6] = 0;
        canTimeSyncData[7] = 0;

        #if defined(DEBUG_NO_CAN)
        serialPrintCANMsg(CAN_TIME_SYNC_MSG_ID, canTimeSyncData, 8);
        #else
        can.beginPacket(CAN_TIME_SYNC_MSG_ID);
        can.write(canTimeSyncData, 8);
        can.endPacket();
        #endif
        canTimeSyncTimeStamp = millis();
      }
    }

  } // end if (gps.fix)

  // --------------------------------------------------------------------------
  // Send GPS Status (sent regardless of fix, so display shows "No Fix" status)
  // --------------------------------------------------------------------------

  if (millis() - canGps3TimeStamp > CAN_GPS3_PERIOD + random(50)) {
    canGps3Data[0] = gps.fixquality;      // 0=No fix, 1=GPS, 2=DGPS (WAAS)
    canGps3Data[1] = gps.fixquality_3d;   // 1=No fix, 2=2D, 3=3D
    canGps3Data[2] = gps.satellites;       // Number of satellites in use
    canGps3Data[3] = 0;                    // Reserved

    // HDOP and VDOP as int16 × 100 (e.g. 1.2 → 120)
    int16_t hdop = (int16_t)(gps.HDOP * 100);
    int16_t vdop = (int16_t)(gps.VDOP * 100);
    canGps3Data[4] = hdop & 0xFF;
    canGps3Data[5] = (hdop >> 8) & 0xFF;
    canGps3Data[6] = vdop & 0xFF;
    canGps3Data[7] = (vdop >> 8) & 0xFF;

    #if defined(DEBUG_NO_CAN)
    serialPrintCANMsg(CAN_GPS3_MSG_ID, canGps3Data, 8);
    #else
    can.beginPacket(CAN_GPS3_MSG_ID);
    can.write(canGps3Data, 8);
    can.endPacket();
    #endif
    canGps3TimeStamp = millis();

    #if defined(DEBUG)
    if (Serial) {
      Serial.print("fix = "); Serial.print(gps.fixquality);
      Serial.print(", 3d = "); Serial.print(gps.fixquality_3d);
      Serial.print(", sat = "); Serial.print(gps.satellites);
      Serial.print(", hdop = "); Serial.print(gps.HDOP);
      Serial.print(", vdop = "); Serial.println(gps.VDOP);
    }
    #endif
  }
}
