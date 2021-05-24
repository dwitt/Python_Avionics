# Python_Avionics

This is my project to create a primarily python based avionics system for experimental aircraft.

Generally the data for the CAN bus is packed little-endian meaning least significant bytes are sent first

| Message Description | ID (hex) | byte 0 | byte 1 | byte 2 | byte 3 | byte 4 | byte 5 | byte 6 | byte 7 |
|---------------------|----------|--------|--------|--------|--------|--------|--------|--------|--------|
|Airspeed, Altitude, VSI|0x28|Airspeed byte0|Airspeed byte1|Altitude byte0|Altitude byte1|Altitude byte2|Vertical Speed byte0|Vertical Speed byte1|unused|
|Angle of Attack (AoA)|0x29|AoA byte0|AoA byte1|||||||
|Outside Temperature and Humidity (OAT)|0x2A|OAT Cx10 byte0|OAT Cx10 byte1|Humidity %|||||
|Raw Altimeter Data STATICP|0x2B|
