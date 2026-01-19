# Raspberry Pi based Electronic Flight Information System (PiEFIS)

## Setup steps on Raspberry Pi OS Lite (64-bit) — labwc version  
(Tested with Raspberry Pi OS Lite (64-bit) Trixie released 04-Dec-2025 on Raspberry Pi 4)

This guide configures PiEFIS on Raspberry Pi OS Lite using **labwc** instead of X11.  
The system boots directly into **Chromium kiosk mode** with no desktop environment.

---

## Create an SD Card

Use the Raspberry Pi Imager program from:  
https://www.raspberrypi.com/software/

Select your Raspberry Pi model. Currently know to work with Raspberry Pi 4. Select Raspberry Pi OS (other) and then select Raspberry Pi OS Lite (64 bit). Pick your storage device. You will then be prompted for the following customizations

- Hostname (so the EFIS is easy to find on the network)
- Localization
- Username and password
- Wi-fi (if required but recommend
- Enable SSH (recommended during setup)
- Raspberry Pi Connect (not required)

Write the SD card using **Raspberry Pi OS Lite (64-bit)** found under the **Raspberry Pi OS (other)** section.

Insert the card and boot the Pi.

---

## Setup the CAN Interface

This should be done first.

Edit `/boot/firmware/config.txt`:

```bash
sudo nano /boot/firmware/config.txt
```

Add the following line at the end of the file:

```ini
dtoverlay=mcp2515-can0,oscillator=12000000,interrupt=25,spimaxfrequency=2000000
```

Notes:

- Verify the oscillator frequency on your CAN board
- Some boards require `spimaxfrequency=1000000`

Save and reboot:

```bash
sudo reboot
```

Verify initialization:

```bash
dmesg | grep -i "\(can\|spi\)"
```

Optional CAN test:<br>
The first line brings up the can interface.

```bash
sudo ip link set can0 up type can bitrate 250000
sudo apt install can-utils
candump can0
```

If CAN traffic appears, continue.

---

## System Setup

Update the system:

```bash
sudo apt update
sudo apt full-upgrade
```
### You should not need to run `raspi-config` but I've included the steps below if required.

Run configuration:

```bash
sudo raspi-config
```

Recommended settings:

- **3 Interface Options → I5 I2C → Enable**<br>This is needed to interface to the i2c encoder.

Optional (these were probably all set when the SD card was created):

- Set Wi-Fi country
- Configure Wi-Fi SSID
- Set hostname
- Enable SSH

---

## Install Required Packages (labwc and Chromium)

```bash
sudo apt install --no-install-recommends labwc
sudo apt install --no-install-recommends chromium
sudo apt install seatd
```

Notes:

- `labwc` is a minimal Wayland compositor.
- No desktop environment is installed
- Chromium is used to present the display on the EFIS.
- Seatd is provided so that cage is not run as root.

Enabled seatd

```bash
sudo systemctl enable --now seatd
```

---

## Fix Chromium Configuration Directory Permissions

Chromium must be able to write to `~/.config`. This directory should be in your users home directory. If you create a user different from `pi` then you will need to change the command below to your user. This may not be necessary and you can check the ownership before attempting to change it.

```bash
cd ~
sudo chown -R pi:pi .config
```

Adjust `pi:pi` if using a different user.

---

## Rotate the Display

**With the Pi Display 2 the standard orientation is portarit**

Edit `/boot/firmware/config.txt`:

```bash
sudo nano /boot/firmware/config.txt
```

Add one of the following:

```ini
display_rotate=1
```

Rotation values:

- `0` = normal
- `1` = 90° clockwise
- `2` = 180°
- `3` = 270° clockwise

This rotates:

- Display output
- Touch input
- Framebuffer

No transformation matrix is required.

---

## Create Local Directories

```bash
mkdir ~/Python_Avionics
mkdir ~/Python_Avionics/support
```

Copy files from the repository:

- `RPi4/*` → `~/Python_Avionics`
- `RPi4/support/*` → `~/Python_Avionics/support`

---

## Python 3 Setup

Verify if Python is installed by trying a dry run (-s option):

```bash
sudo apt install -s python3
```
You should expect to find a copy of python version 3.xx installed. Check at http://python.org to see what the latest release is. The version installed as part of the Raspberry Pi OS may not be the latest but it should be close.


Install the tools required for a virtual enviornment and to all pip to be used to install python packages:

```bash
sudo apt install --no-install-recommends python3-virtualenv python3-pip
```

You may also need the development tools.

```bash
sudo apt install --no-install-recommends python3-dev build-essential
```

Create and activate the virtual environment:

```bash
virtualenv Python_Avionics
source Python_Avionics/bin/activate
```

Install required packages:

```bash
pip3 install asyncio
pip3 install aiohttp
pip3 install python-can
pip3 install adafruit-circuitpython-seesaw
pip3 install adafruit_extended_bus
pip3 install rpi_backlight
```

---

## Configure Boot for Faster Startup

Edit `/boot/firmware/config.txt`:

```bash
sudo nano /boot/firmware/config.txt
```

Add:

```ini
initial_turbo=60
disable_splash=1
```

Optional (recommended): 
 
Add `quiet` to `/boot/cmdline.txt`.

---

## Configure the CAN Interface to Start Automatically

Copy `linux/can0.service` from the repo to:

```bash
/etc/systemd/system/can0.service
```

Enable and start:

```bash
sudo systemctl enable can0
sudo systemctl start can0
```
Note that if you previously started the service to test the can interface it will error when you try to start it again.

Edit bitrate if required.

---
## Configure the Python WebServer to Start Automatically

Copy the file `linux/piefis.service` from the repo to:

```
etc/systemd/system/piefis.service
```

Enable and start the service

```bash
sudo systemctl enable piefis.service
```
##TODO: ENABLE LOGGING ***

---
## Configure labwc + Chromium Startup (Kiosk Mode)

Edit the `piefis-labwc.service` file and change the user name to your user.

Copy `linux/piefis-labwc.service` from the repo to:

```
/etc/systemd/system/piefis-labwc.service
```

Enable and start the service.

```bash
sudo systemctl enable piefis-labwc
sudo systemctl start piefis-labwc
```

---

## Scale the Display if Required

If you want to upscale the display you can add the follwoing:

```
wlr-randr --output DSI-1 --scale=0.5 &
```

to `~/.config/labwc/autostart`

## Hide the pointer

```bash
sudo apt install wtype
```

Add 

```
wtype -M alt -M logo h -m logo -m alt
```
to `~/.config/labwc/sutostart`



## Disable Unused Services (Optional but Recommended)

Disabling unused services significantly reduces boot time.

```bash
sudo systemctl disable ssh
sudo systemctl disable hciuart
sudo systemctl disable nmbd
sudo systemctl disable smbdsud
sudo systemctl disable systemd-timesyncd
sudo systemctl disable wpa_supplicant
sudo systemctl disable rpi-eeprom-update
sudo systemctl disable raspi-config
sudo systemctl disable dhcpcd
```

---

## Final Result

On reboot, the system will:

1. Boot Raspberry Pi OS Lite
2. Initialize the CAN interface
3. Start a minimal Wayland compositor
4. Launch Chromium fullscreen at `http://localhost:8080`
5. Run with no desktop, no window manager, and no X11

