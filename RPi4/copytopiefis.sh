#!/bin/bash

# Script to be run from the RPi4 directory

piefis_main_dir=/home/pi/Python_Avionics/
piefis_support_dir=/home/pi/Python_Avionics/support/
destination_server=piefis-4.local

echo 'Copying main files to the Pi Efis'

echo "$destination_server"

rsync index.html pi@"$destination_server":"$piefis_main_dir"index.html
rsync aio-Server.py pi@"$destination_server":"$piefis_main_dir"aio-Server.py

rsync support/efis-display.js pi@"$destination_server":"$piefis_support_dir"efis-display.js
rsync support/ribbon.mjs pi@"$destination_server":"$piefis_support_dir"ribbon.mjs
echo 'Done'