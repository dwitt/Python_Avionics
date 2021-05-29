#!/bin/sh
# ~/.xinitrc


xrandr --output HDMI-1 --mode 800x480

# disable energy star features
xset -dpms
# set screen saver to off
xset s off
# set screen saver to no blanking
xset s noblank

# Allow quitting the X server with CTRL-ATL-Backspace
setxkbmap -option terminate:ctrl_alt_bksp

# Remove old sessions of chromium
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State'
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]\+"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

# Start unclutter to hide the mouse pointer
unclutter -idle 0 &
# Start the Browser
chromium-browser http://localhost:8080 --window-size=800,480 --window-position=0,0 \
    --start-fullscreen --kiosk --noerrdialogs \
    --disable-translate --no-first-run --fast --fast-start \
    --disable-infobars --disable-features=TranslateUI \
    --disk-cache-dir=/dev/null --password-store=basic \
    --enable-features=OverlayScrollbar,OverlayScrollbarFlashAfterAnyScrollUpdate,OverlayScrollbarFlashWhenMouseEnter