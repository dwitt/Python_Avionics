#!/bin/bash

# Script to be run from the RPi4 directory

piefis_main_dir=/home/pi/Python_Avionics/
piefis_support_dir=/home/pi/Python_Avionics/support/
destination_server=piefis-4.local

echo 'Copying main files to the Pi Efis'

echo "$destination_server"

rsync index.html pi@"$destination_server":"$piefis_main_dir"index.html
rsync aio_server.py pi@"$destination_server":"$piefis_main_dir"aio_server.py

rsync support/efis-display.js pi@"$destination_server":"$piefis_support_dir"efis-display.js
rsync support/ribbon.mjs pi@"$destination_server":"$piefis_support_dir"ribbon.mjs
rsync support/airspeedRibbon.mjs pi@"$destination_server":"$piefis_support_dir"airspeedRibbon.mjs
rsync support/vsi-indicator.mjs pi@"$destination_server":"$piefis_support_dir"vsi-indicator.mjs
rsync support/attitude-indicator.mjs pi@"$destination_server":"$piefis_support_dir"attitude-indicator.mjs
rsync support/slipBall.mjs pi@"$destination_server":"$piefis_support_dir"slipBall.mjs
rsync support/headingIndicator.mjs pi@"$destination_server":"$piefis_support_dir"headingIndicator.mjs
rsync support/interaction.mjs pi@"$destination_server":"$piefis_support_dir"interaction.mjs
rsync support/specialRectangle.mjs pi@"$destination_server":"$piefis_support_dir"specialRectangle.mjs
rsync support/qnhdisplay.mjs pi@"$destination_server":"$piefis_support_dir"qnhdisplay.mjs
rsync support/speedDisplay.mjs pi@"$destination_server":"$piefis_support_dir"speedDisplay.mjs
rsync support/altitudeDisplay.mjs pi@"$destination_server":"$piefis_support_dir"altitudeDisplay.mjs
rsync support/userInput.mjs pi@"$destination_server":"$piefis_support_dir"userInput.mjs
rsync support/numericWheelDisplay.mjs pi@"$destination_server":"$piefis_support_dir"numericWheelDisplay.mjs
rsync support/utilityFunctions.mjs pi@"$destination_server":"$piefis_support_dir"utilityFunctions.mjs
rsync support/tempTimeDisplay.mjs pi@"$destination_server":"$piefis_support_dir"tempTimeDisplay.mjs
rsync support/airSpeedWheel.mjs pi@"$destination_server":"$piefis_support_dir"airSpeedWheel.mjs
rsync support/altitudeWheel.mjs pi@"$destination_server":"$piefis_support_dir"altitudeWheel.mjs


echo 'Done'