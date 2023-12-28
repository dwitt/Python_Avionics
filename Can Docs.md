Generally the data for the CAN bus is packed little-endian meaning least significant bytes are sent first

| Message Description | ID<br/>(hex) | byte 0 | byte 1 | byte 2 | byte 3 | byte 4 | byte 5 | byte 6 | byte 7 |
|---------------------|----------|--------|--------|--------|--------|--------|--------|--------|--------|
|Airspeed, Altitude, VSI<br/>[signed integers]<br/>(knots, ft, ft/min)|0x28|Airspeed <br/>byte 0|Airspeed <br/>byte 1|Altitude <br/>byte 0|Altitude byte 1|Altitude byte 2|Vertical Speed <br/>byte 0|Vertical Speed<br/> byte 1|unused|
|*Angle of Attack (AoA)*|0x29|AoA <br/>byte0|AoA <br/>byte1| | | | | | |
|*Outside Temperature and Humidity (OAT)*|0x2A|OAT<br/> (C x 10)<br/> byte 0|OAT<br/> (C x 10)<br/> byte1|Humidity %| | | | ||
|Raw Altimeter Data STATICP|0x2B|Static Pressure<br/>(hPa x 10)<br/> byte 0|Static Pressure<br/>(hPa x 10)<br/>byte 1|Sensor Temp||||||
|QNH<br>[unsigned integers]<br/>(hPa, in-Hg x 100)|0x2E|QNH (hpa)<br/>byte 0|QNH (hpa)<br/>byte 1|QNH<br/>(in-Hg x 100)<br/>byte 0|QNH<br/>(in-Hg x 100)<br>byte 1|||||
|||||||||||
|AHRS Orientation|0x48|Heading <br/>byte 0| Heading <br/> byte 1|Pitch <br/> byte 0|Pitch <br/> byte 1|Roll <br /> byte 0|Roll <br/> byte 1|Turn Rate<br/>byte 0|Turn Rate<br/>byte 1|
|AHRS Acceleration|0x49|Acc X<br/>byte 0|Acc X<br/>byte 1|Acc Y<br/>byte 0|Acc Y<br/>byte 1|Acc Z<br/>byte 0|Acc Z<br/>byte 1|Calib.<br/>byte 0|Calib.<br/>byte 1|
|AHRS Control Commands|0x23|Calibration<br/>1 = save||||||||
|||||||||||
|GPS Co-ordinates<br/>[signed integer]<br/>(degrees x 1,000,000)|0x63|Latitude<br/>byte 0|Latitude<br/>byte 1|Latitude<br/>byte 2|Latitude<br/>byte 3|Longitude<br/>byte 0|Longitude<br/>byte 1|Longitude<br/>byte 2|Longitude<br/>byte 3|
|GPS: GS, Alt, True Track|0x64|Ground<br/>Speed<br/>byte 0|Ground<br/>Speed<br/>byte 1|Altitude<br/>byte 0|Altitude<br/>byte 1|True Track<br/>byte 0|True Track<br/>byte1|||
|||||||||||
|EMS. RPM|0x32|RPM <br/>byte 0|RPM </br>byte 1|||||||
|EMS - Oil Temp, Oil Pressures|0x51|Oil Pressure<br>(kPa x 10) byte 0|Oil Pressure<br>(kPa x 10)<br/>byte 1| Oil Temp<br>(°C x 10)<br/>byte 0|Oil Temp<br>(°C x 10)<br/>byte 1|Oil Pressure<br>(psi x 10) byte 0|Oil Pressure<br>(psi x 10) byte 1|Oil Temp<br>(°F x 10)<br>byte 0|Oil Temp<br>(°F x 10)<br>byte 1|
|EMS - EGT 1,2, CHT 1,2|0x52|EGT 1 °F<br>byte 0|EGT 1 °F<br>byte 1|EGT 2 °F<br>byte 0|EGT 2 °F<br>byte 2|CHT 1 °F<br>byte 0|CHT 1 °F<br>byte 1|CHT 2 °F<br>byte 0|CHT 2 °F<br>byte 1|
|EMS - EGT 3,4, CHT 3,4|0x53|EGT 3 °F<br>byte 0|EGT 3 °F<br>byte 1|EGT 4 °F<br>byte 0|EGT 4 °F<br>byte 2|CHT 3 °F<br>byte 0|CHT 3 °F<br>byte 1|CHT 4 °F<br>byte 0|CHT 4 °F<br>byte 1|
