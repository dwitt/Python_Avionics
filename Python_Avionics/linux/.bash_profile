# ~/.bash_profile

# check that $DISPLAY is empty. If it isn't we are probably already running X
# check that the virtual terminal number is 1 
# if both are true then startx
[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx