#include <Adafruit_Crickit.h>
#include <Adafruit_seesaw.h>
#include <seesaw_neopixel.h>
#include <Adafruit_MCP2515.h>

//#define DEBUG

/*** Rotary Encoder defines **************************************************/

#define SWITCH_PIN		24
#define	NEOPIXEL_PIN	6

#define	ENCODER_ADDRESS	0X36

/*** CAN Bus Interface Defines ***********************************************/

#define CAN_CS_PIN			19			// RP2040 CAN bus feather
#define CAN_INTERRUPT_PIN	22			// RP2040 CAN bus feather
#define CAN_BAUD_RATE		250000

/*** CAN Message Constants ***************************************************/

#define CAN_ENCODER_MSG_ID	0x38		// Panel Control (Rotary Control)

#define CAN_ENCODER_PERIOD	250			// milliseconds
#define CAN_ENCODER_CHANGE_PERIOD	60 // miliseconds

/*****************************************************************************
 * Create a rotaryEncoder object for the Adafruit seesaw rotary encoder
 *****************************************************************************/
Adafruit_seesaw rotaryEncoder;

/*****************************************************************************
 * Create a NeoPixel object for the NeoPixel on the encoder
 *****************************************************************************/
seesaw_NeoPixel rotaryEncoderPixel = seesaw_NeoPixel(1, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

/*****************************************************************************
 * Create a CAN bus object
 *****************************************************************************/

Adafruit_MCP2515 can(CAN_CS_PIN);

/*****************************************************************************
 * Define file local variables and functions
 *****************************************************************************/

static long 	canEncoderTimeStamp = 0;
static long 	canEncoderChangeTimeStamp = 0;

static int32_t	encoderPosition;			// global variable to hold the encoder position
static bool		encoderSwitchState;			// global variable to hold the switch state

void setup() {
	/*************************************************************************
	 * Startup serial port if we are in DEBUG mode
	 *************************************************************************/
	
	#if defined(DEBUG)
		Serial.begin(115200);
		while (!Serial) delay(10);
		Serial.println("Serial Started.");
		Serial.println("Looking for Encoder.");
	#endif

	/*************************************************************************
	 * Start the rotary encoder
	 *************************************************************************/
	
	if (! rotaryEncoder.begin(ENCODER_ADDRESS) || ! rotaryEncoderPixel.begin(ENCODER_ADDRESS)) {
		#if defined(DEBUG)
			Serial.println("Couldn't find encoder.");
		#endif
		while(true) delay(10);	// halt
	}
	#if defined(DEBUG)
		Serial.println("Encoder Started.");
	#endif

	/*** Check the seesaw version to be sure we are talking to an encoder ****/
	
	uint32_t seesawVersion = ((rotaryEncoder.getVersion() >> 16) & 0xffff);
	if (seesawVersion != 4991) {
		#if defined(DEBUG) 
			Serial.print("Found the incorrect firmware installed: ");
			Serial.println(seesawVersion);
		#endif
		while(true) delay(10); // halt
	}

	// reduce neopixel brightness
	rotaryEncoderPixel.setBrightness(20);
	rotaryEncoderPixel.show();

	/*** Setup the encoders built in switch **********************************/
	
	rotaryEncoder.pinMode(SWITCH_PIN, INPUT_PULLUP);

	/*** Save the encoder's starting position ********************************/
	
	encoderPosition = rotaryEncoder.getEncoderPosition();
	encoderSwitchState = !rotaryEncoder.digitalRead(SWITCH_PIN); // true if pressed

	/*** Enable interrupts - I AM NOT SURE WHY THIS IS BEING DONE ************/
	
	#if defined(DEBUG)
		Serial.println("Enabling seesaw interrupts for the rotary Encoder");
	#endif
	rotaryEncoder.setGPIOInterrupts((uint32_t)1 << SWITCH_PIN, true);
	bool enabled = rotaryEncoder.enableEncoderInterrupt();
	#if defined(DEBUG)
		if (!enabled) {
			Serial.println("Could not enable Encoder Interrupt.");
		} else {
			Serial.println("Encoder interrupt enabled");
		}
	#endif

	/*************************************************************************
	 * Start the CAN bus
	 *************************************************************************/

	if (! can.begin(CAN_BAUD_RATE)) {
		#if defined(DEBUG)
			Serial.println("Error initializing the CAN bus.");
		#endif
		while(true) delay(10);	// halt
	}
	#if defined(DEBUG)
		Serial.println("CAN bus initialized.");
	#endif

	
}

void loop() {

	bool newEncoderData = false;

	/*** Data structure to hold the encoder data *****************************/
	struct EncoderData {
		int32_t position;
		bool	buttonState;		// True is activated
	} encoder;

	/*** Union to make sending the CAN data easiers **************************/
	union CANDataUnion
	{
		uint8_t	bytes[5];
		EncoderData encoder;
	} canData;
  
	/*** Get the current time to be used to determine if we need so send CAN */
	/*** message *************************************************************/

	long currentTimeMillis = millis();

	/*** Determine if there is new data to send ******************************/

	bool newState = !rotaryEncoder.digitalRead(SWITCH_PIN);
	if (encoderSwitchState != newState) {
		#if defined(DEBUG)
			Serial.print("Switch state: ");
			Serial.println(newState);
		#endif
		encoderSwitchState = newState;
		newEncoderData = true;
	}

	int32_t newPosition = rotaryEncoder.getEncoderPosition();
	if (encoderPosition != newPosition) {
		#if defined(DEBUG)
			Serial.println(newPosition);
		#endif
		encoderPosition = newPosition;
		newEncoderData = true;
	}

	/*************************************************************************
	 * Send CAN data
	 *************************************************************************/

	if ((currentTimeMillis > (canEncoderTimeStamp + CAN_ENCODER_CHANGE_PERIOD + random(50)) && newEncoderData) ||
		currentTimeMillis > (canEncoderTimeStamp + CAN_ENCODER_PERIOD + random(50)))
	{
		canData.encoder.position = encoderPosition;
		canData.encoder.buttonState = encoderSwitchState;
		can.beginPacket(CAN_ENCODER_MSG_ID);
		can.write(canData.bytes, 5);
		can.endPacket();
		canEncoderTimeStamp = currentTimeMillis;
	}


}
