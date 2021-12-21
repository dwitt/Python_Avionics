#!/bin/bash

# Script to be run from the RPi4 directory

piefis_main_dir=/media/air/
piefis_library_dir=/media/air/lib/
destination_server=piefis-4.local

echo 'Copying main files to the Pi Efis'

echo "$destination_server"

rsync -r * pi@"$destination_server":"$piefis_air_dir"

echo 'Done'