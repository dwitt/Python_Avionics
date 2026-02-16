# PiEFIS Setup Guide (Wayland/labwc)

## Raspberry Pi based Electronic Flight Information System
(Tested with Raspberry Pi OS Lite (64-bit) Trixie released 04-Dec-2025 on Raspberry Pi 4)

This guide configures PiEFIS on Raspberry Pi OS Lite using **labwc** instead of X11.  
The system boots directly into **Chromium kiosk mode** with no desktop environment.

---

## Create an SD Card

Use the Raspberry Pi Imager program from:  
https://www.raspberrypi.com/software/

Select your Raspberry Pi model. Currently known to work with Raspberry Pi 4. Select Raspberry Pi OS (other) and then select Raspberry Pi OS Lite (64 bit). Pick your storage device. You will then be prompted for the following customizations

- Hostname (so the EFIS is easy to find on the network)
- Localization
- Username and password
- Wi-Fi (if required but recommended)
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

Add the following lines at the end of the file:

```ini
dtoverlay=mcp2515-can0,oscillator=12000000,interrupt=25,spimaxfrequency=2000000
dtoverlay=gpio-shutdown,gpio_pin=17,active_low=1,gpio_pull=up
```

Notes:

- Verify the oscillator frequency on your CAN board
- Some boards require `spimaxfrequency=1000000`
- The `gpio-shutdown` overlay enables a clean shutdown when GPIO17 is pulled low (e.g. via a pushbutton to ground)

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
- Seatd is provided so that labwc is not run as root.

Enable seatd:

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

## Display Rotation

The Pi Display 2 defaults to portrait orientation. With `display_auto_detect=1` in `config.txt` (set by default in Raspberry Pi OS Trixie), the display rotation is handled automatically and no `display_rotate` setting is required.

If you are using a different display and need to rotate manually, add one of the following to `/boot/firmware/config.txt`:

```ini
display_rotate=1
```

Rotation values:

- `0` = normal
- `1` = 90° clockwise
- `2` = 180°
- `3` = 270° clockwise

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
You should expect to find Python 3 installed. Raspberry Pi OS Trixie ships with Python 3.13. The version installed may not be the very latest but it should be close. Check at http://python.org to see what the current release is.


Install the tools required for a virtual environment and to allow pip to be used to install python packages:

```bash
sudo apt install --no-install-recommends python3-virtualenv python3-pip
```

You may also need the development tools.

```bash
sudo apt install --no-install-recommends python3-dev build-essential
```

Create and activate the virtual environment. Note that the virtual environment is created inside the `~/Python_Avionics` directory alongside the application code:

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
enable_uart=1
```

- `initial_turbo` — runs the CPU at maximum frequency for the first 60 seconds to speed up boot
- `disable_splash` — suppresses the rainbow splash screen
- `enable_uart` — enables the primary UART serial port on GPIO14/15. This provides a serial console fallback if SSH and networking are unavailable. May also be needed for serial GPS modules or other serial devices.

Optional — the following can be added to `/boot/firmware/cmdline.txt` to clean up the boot process. Note that `quiet` makes boot issues harder to diagnose.

- `quiet` — suppresses kernel boot messages on the console
- `fastboot` — skips filesystem checks on boot

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
/etc/systemd/system/piefis.service
```

Enable and start the service

```bash
sudo systemctl enable piefis.service
```

Logging is configured in the service file to append to `/var/log/piefis.log`.

---
## Configure labwc + Chromium Startup (Kiosk Mode)

Edit the `piefis-labwc.service` file and change the `User=` and `HOME=` values to your user.

Copy `linux/piefis-labwc.service` from the repo to:

```
/etc/systemd/system/piefis-labwc.service
```

The service file:

- Runs labwc as your user (not root) via seatd
- Creates a private runtime directory at `/run/piefis`
- Cleans up stale Wayland sockets before starting
- Waits for seatd to be ready before launching
- Launches Chromium in kiosk mode via `dbus-run-session`
- Disables unnecessary Chromium features (sync, translate, infobars, etc.)
- Uses `--ozone-platform=wayland` for native Wayland rendering
- Restarts automatically on failure

Enable and start the service:

```bash
sudo systemctl enable piefis-labwc
sudo systemctl start piefis-labwc
```

---

## Install Display Utilities

```bash
sudo apt install wlr-randr wtype
```

- `wlr-randr` is the Wayland equivalent of `xrandr` — used to set display scale and resolution
- `wtype` is the Wayland equivalent of `xdotool` — used to send keyboard shortcuts to hide the pointer

## Scale the Display if Required

If you want to scale the display you can add the following to `~/.config/labwc/autostart`:

```
wlr-randr --output DSI-1 --scale=1.25 &
```

A scale value greater than 1.0 makes content larger (fewer logical pixels). Adjust to suit your display.

## Hide the Pointer

Add the following to `~/.config/labwc/autostart` to hide the mouse pointer once Chromium is running:

```bash
(
  for i in $(seq 1 100); do
    pgrep -x chromium >/dev/null && break
    sleep 0.1
  done
  sleep 1.0
  wtype -M alt -M logo h -m logo -m alt
) &
```

This waits for Chromium to start before sending the hide-pointer shortcut.



## Disable Unused Services (Optional but Recommended)

Disabling unused services significantly reduces boot time.

```bash
sudo systemctl disable ssh                # If you don't need SSH to access the Pi
sudo systemctl disable hciuart            # Disables Bluetooth UART
sudo systemctl disable nmbd               # If you have Samba installed
sudo systemctl disable smbd               # If you have Samba installed
sudo systemctl disable systemd-timesyncd  # Disables time sync across the network
sudo systemctl disable wpa_supplicant     # Disables WPA for Wi-Fi network connections
sudo systemctl disable rpi-eeprom-update  # Disables eeprom updates on boot
sudo systemctl disable raspi-config       # Disables raspi-config from updating on boot
sudo systemctl disable dhcpcd             # Disables DHCP client
```

---

## Final Result

On reboot, the system will:

1. Boot Raspberry Pi OS Lite
2. Initialize the CAN interface
3. Start labwc (minimal Wayland compositor) via seatd
4. Launch Chromium fullscreen in kiosk mode at `http://localhost:8080`
5. Run with no desktop environment and no X11

