#!/bin/bash

# Script to be run from the Python_Avionics directory

# remote directories on the pi-efis computer
piefis_main_dir=/home/david/Python_Avionics/
piefis_support_dir=/home/david/Python_Avionics/support/
piefis_linux_dir=/home/david/Python_Avionics/linux/

destination_server=pi-efis.local
user=david

echo 'Copying main files to the Pi Efis'

echo "$destination_server"

rsync index.html "$user"@"$destination_server":"$piefis_main_dir"index.html
rsync aio_server.py "$user"@"$destination_server":"$piefis_main_dir"aio_server.py

rsync support/efis-display.js "$user"@"$destination_server":"$piefis_support_dir"efis-display.js
rsync support/ribbon.mjs "$user"@"$destination_server":"$piefis_support_dir"ribbon.mjs
# rsync support/airspeedRibbon.mjs "$user"@"$destination_server":"$piefis_support_dir"airspeedRibbon.mjs
# rsync support/vsi-indicator.mjs "$user"@"$destination_server":"$piefis_support_dir"vsi-indicator.mjs
rsync support/attitude-indicator.mjs "$user"@"$destination_server":"$piefis_support_dir"attitude-indicator.mjs
# rsync support/slipBall.mjs "$user"@"$destination_server":"$piefis_support_dir"slipBall.mjs
rsync support/headingIndicator.mjs "$user"@"$destination_server":"$piefis_support_dir"headingIndicator.mjs
# rsync support/interaction.mjs "$user"@"$destination_server":"$piefis_support_dir"interaction.mjs
# rsync support/specialRectangle.mjs "$user"@"$destination_server":"$piefis_support_dir"specialRectangle.mjs
# rsync support/qnhdisplay.mjs "$user"@"$destination_server":"$piefis_support_dir"qnhdisplay.mjs
# rsync support/speedDisplay.mjs "$user"@"$destination_server":"$piefis_support_dir"speedDisplay.mjs
# rsync support/altitudeDisplay.mjs "$user"@"$destination_server":"$piefis_support_dir"altitudeDisplay.mjs
# rsync support/userInput.mjs "$user"@"$destination_server":"$piefis_support_dir"userInput.mjs
# rsync support/numericWheelDisplay.mjs "$user"@"$destination_server":"$piefis_support_dir"numericWheelDisplay.mjs
# rsync support/utilityFunctions.mjs "$user"@"$destination_server":"$piefis_support_dir"utilityFunctions.mjs
# rsync support/tempTimeDisplay.mjs "$user"@"$destination_server":"$piefis_support_dir"tempTimeDisplay.mjs
# rsync support/airSpeedWheel.mjs "$user"@"$destination_server":"$piefis_support_dir"airSpeedWheel.mjs
# rsync support/altitudeWheel.mjs "$user"@"$destination_server":"$piefis_support_dir"altitudeWheel.mjs
# rsync support/brightness.mjs "$user"@"$destination_server":"$piefis_support_dir"brightness.mjs
# rsync support/temperatureGraph.mjs "$user"@"$destination_server":"$piefis_support_dir"temperatureGraph.mjs

#rsync support/pixi.min-v8.1.5.mjs "$user"@"$destination_server":"$piefis_support_dir"pixi.min.mjs
#rsync support/pixi.min-v8.1.5.mjs.map "$user"@"$destination_server":"$piefis_support_dir"pixi.min.mjs.map
#rsync support/pixi-v8.1.5.js "$user"@"$destination_server":"$piefis_support_dir"pixi.js
#rsync support/pixi-v8.1.5.js.map "$user"@"$destination_server":"$piefis_support_dir"pixi.js.map

rsync support/pixi-v8.6.6.mjs "$user"@"$destination_server":"$piefis_support_dir"pixi.mjs
rsync support/pixi-v8.6.6.min.mjs "$user"@"$destination_server":"$piefis_support_dir"pixi.min.mjs
rsync support/pixi-v8.6.6.mjs.map "$user"@"$destination_server":"$piefis_support_dir"pixi.mjs.map
rsync support/pixi-v8.6.6.min.mjs.map "$user"@"$destination_server":"$piefis_support_dir"pixi.min.mjs.map

rsync "support/Tahoma Bold.ttf" "$user"@"$destination_server":"$piefis_support_dir"Tahoma\ Bold.ttf
rsync support/Tahoma.ttf "$user"@"$destination_server":"$piefis_support_dir"Tahoma.ttf
# rsync support/efis-test.js "$user"@"$destination_server":"$piefis_support_dir"efis-test.js



#rsync ../linux/.bash_profile "$user"@"$destination_server":"$piefis_linux_dir".bash_profile
#rsync ../linux/.xinitrc "$user"@"$destination_server":"$piefis_linux_dir".xinitrc
#rsync ../linux/interface-can "$user"@"$destination_server":"$piefis_linux_dir"interface-can
#rsync ../linux/piefis.service "$user"@"$destination_server":"$piefis_linux_dir"piefis.service

echo 'Done'