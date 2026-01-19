# Debugging Commands

###Running piefis at the command line

```
sudo systemctl stop piefis
cd ~
source Python_Avionics/bin/activate
cd Python_Avionics
python aio_server.py
```

###Investigating I2C

```
sudo i2cdetect -y 5
```

### Fixing Keys

```
ssh-keygen -R hostname_or_ip
```

```