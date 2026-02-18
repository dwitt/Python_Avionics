
Raspberry Pi based Electronic Flight Information System (PiEfis)

# Setup steps on Raspberry Pi OS Lite (32-bit) Released 19-Nov-2024

## Create an SD Card

Use the Raspberry Pi Imager program that can be found on the [raspberrypi.com](https://raspberrypi.com) website at [www.raspberrypi.com/software/](https://www.raspberrypi.com/software/) to create an SD card image. Use the advanced options, gear icon, to setup the following:
- set the hostname so you can find the EFIS if you are using a local network.
- enable SSH if you want to connect to the EFIS while setting things up.
- set the username and password. 
- configure wifi if you plan to connect to the EFIS locally.  
- set the local and keyboard layout.
Save your changes, write the SD card with the Raspberry Pi OS Lite (32-bit).

Insert the programmed card into your Pi and start it.

## Setup the CAN interface
I suggest doing this first as I had issues sometimes with it and wanted to make sure it was working before getting the rest of the software installed.

- Edit /boot/config.txt using the command `sudo nano /boot/config.txt`
- Add the following line at the end of the file. 
~~~
dtoverlay=mcp2515-can0,oscillator=12000000,interrupt=25,spimaxfrequency=2000000
~~~
- You need to check the frequency of the oscillator/crystal on your CAN board and ensure that the frequency entered into the config.txt file matches. If you find your board doesn't work you can try reducing the spimaxfrequency value. Some boards need 1000000.
- To save the file and exit the nano editor type `ctrl-s` and `ctrl-x`.
- Reboot the Pi using `sudo reboot` to enable the can interface.
- After the Pi restarts you can check if the can interface was recognized by typing `dmesg | grep -i "\(can\|spi\)"`. This should give you a message that the MCP2515 was successfully initialized. At this point if the interface initialized it should work. If you want to be absolutely sure and you have the ability to send can messages to the Pi you can do the following:
  - Start the can interface by typing the following where the bitrate matches the rate that you are sending on the can bus.
  ~~~
  sudo ip link set can0 up type can bitrate 250000
  ~~~ 
  - Install the can utilities by typing
  ~~~
  sudo apt install can-utils
  ~~~
  - Finally, use the can dump command to see what is coming in the can bus.
  ~~~
  candump can0
  ~~~
  If the can bus is working you can continue with the setup.

## System Setup
- Update your Raspberry Pi OS using:
~~~ 
sudo apt update
sudo apt full-upgrade
~~~

- `sudo raspi-config` **note:** raspi-config changes from time to time so the selections below may not exactly match the version of raps-config installed on you Pi.
  - -> 1 System Options -> S5 Boot / Auto Login -> B2 Console Autologin
  - -> 3 Interface Options ->I5 I2C Enable the Arm I2C interface.
  - **The following are optional** and were probably competed as part of the SD card creation.
    - If you want to use Wi-Fi the country needs to be set.
    - -> 5 Localisation Options -> L4 WLAN Country -> _select appropriate country_
    - -> 1 System Options -> S1 Wireless LAN -> _set the SSID and password as appropriate_
    - If you want to change the host name so that it is easier to find on your network.
    - -> 1 System Options -> S4 Hostname
    - If you want to be able to SSH to your PiEfis. (This can be helpful while setting everything up.)
    - -> 3 Interface Options -> P2 SSH
## Install packages
The following packages install the required library to support WebGL, X11 (the graphical interface) the browser, uncluttered (to hide the mouse pointer)

~~~
sudo apt install libgles2
sudo apt install --no-install-recommends xserver-xorg x11-xserver-utils xinit
sudo apt install --no-install-recommends chromium-browser
sudo apt install unclutter
~~~

Chromium needs to be able to access the .config directory in the users home. I found mine was owned by root and prevented Chromium from running. This can be changed using
~~~
chown pi:pi .config
~~~
In the users home directory. Adjust pi:pi as required based on the userid. 

## Rotate the Display

The display can be rotated by adding or editing one of the Xorg configuration files.

Add a `10-monitor.conf` file to the `/usr/share/x11/xorg.conf.d` directory. It should contain the following:

~~~
Section "Monitor"
    Identifier "DSI-1"
    Option "Rotate" "right"  # or left, inverted, normal
EndSection

Section "Screen"
    Identifier "Screen0"
    Device "Device0"
    Monitor "DSI-1"
EndSection
~~~

To rotate the touch screen a transformation matrix needs to be applied to the touch screen. Edit the file `40-libinput.con` found in the `/usr/share/X11/xorg.conf.d` directory. Find the section that looks like:
~~~
Section "InputClass"
        Identifier "libinput touchscreen catchall"
        MatchIsTouchscreen "on"
        MatchDevicePath "/dev/input/event*"
        Driver "libinput"
EndSection
~~~
And add the following in line after `MatchIsTouchscreen "on"` to rotate the touch screen 270 degrees:
~~~
Option "TransformationMatrix" "0 -1 1 1 0 0 0 0 1"
~~~
To rotate 90 degrees use a matrix of `"0 1 0 -1 0 1 0 0 1"`.


## Create the local directories
- `mkdir ~/EFIS`
- `mkdir ~/EFIS/support`
- Copy the files from `RPi4` and `RPi4/support` in the repo to `~/EFIS` and `~/EFIS/support`

## Add Files for Python 3
Python 3 should already be installed. You can double check it using

`sudo apt install -s python3`

First, you need to install pip and virtual env so that it can be used to install Python libraries in the environment we are going to use

`sudo apt install --no-install-recommends python3-virtualenv`
`sudo apt install --no-install-recommends python3-pip`

Next, create a virtual environment and activate it. Do this from the home directory.

`virtualenv EFIS`

Activate the environment.

`source EFIS/bin/activate`

Finally install the required packages.

- `sudo pip3 install asyncio`
- `sudo pip3 install aiohttp`
- `sudo pip3 install python-can`
- `sudo pip3 install adafruit-circuitpython-seesaw`
- `pip3 install adafruit_extended_bus`

## Configure the Pi boot up to decrease the time required
- Edit /boot/config.txt using the command `sudo nano /boot/config.txt` and add the lines below at the end of the file. This will enable turbo mode for 60 seconds to speed up booting. The splash screen will be disabled and the boot delay is set to 0 seconds
~~~
initial_turbo=60
disable_splash=1
<!-- boot_delay=0 --->
~~~
<!-- - Add `quiet` to `/boot/cmdline.txt`. _**note:** Originally included `fast boot` after `quiet` -->

## Configure the Pi to start the CAN interface
- Copy the file `linux/can0.service` from the repo to the directory `/etc/systemd/system/`
- Enable the service and start it.
- NOTE: if required, edit `can0.service` to set the correct bitrate for the can bus.
~~~
sudo systemctl enable can0
sudo systemctl start can0
~~~
- NOTE: if the can interface is already running the start command will fail.

## Configure the Pi to start X and run Chromium on startup
- Add contents of `linux/.xinitrc` from repo into file `~/.xinitrc`
- Add contents of `linux/.bash_profile` from repo into file `~/.bash_profile`
- Copy the file `linux/piefis.service` from repo to `/etc/systemd/system/piefis.service`
- `sudo systemctl enable piefis.service`
- `sudo /sbin/ip link set can0 up type can bitrate 500000`

## Disable unused services once everything is done. This decreases boot time substantially:
- `sudo systemctl disable ssh` _# If you don't need SSH to access the Pi_
- `sudo systemctl disable hciuart` _# Disables the UARTS so you cannot connect vi Serial_
- `sudo systemctl disable nmbd` _# If you have samba installed_
- `sudo systemctl disable smbd` _# If you have samba installed_
- `sudo systemctl disable systemd-timesyncd` _# Disables time sync across the network_
- `sudo systemctl disable wpa_supplicant` _# Disables WPA for wifi network connections_
- `sudo systemctl disable rpi-eeprom-update` _# Disables eeprom updates on boot_
- `sudo systemctl disable raspi-config` _# Disables rasps-config from updating the system on boot_
- `sudo systemctl disable dhcpcd` _# Disables dhcp_

Now when you reboot the system should start into startx and run Chromium with http://localhost:8080.