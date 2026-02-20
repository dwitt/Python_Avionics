# Pi-Side Rename: Python_Avionics → EFIS

These steps rename `~/Python_Avionics` to `~/EFIS` on the Raspberry Pi and update the systemd service to match.

## Prerequisites

- SSH into the Pi: `ssh david@pi-efis.local`
- Make sure you have the list of pip packages before you start (step 1)

## Steps

### 1. Record your installed pip packages

```bash
source ~/Python_Avionics/bin/activate
pip freeze > ~/requirements.txt
deactivate
```

### 2. Stop the service

```bash
sudo systemctl stop piefis
```

### 3. Rename the directory

```bash
mv ~/Python_Avionics ~/EFIS
```

### 4. Remove the old virtualenv and recreate it

The virtualenv has hardcoded absolute paths that break when the directory is renamed. Delete the venv files and recreate in place.

```bash
cd ~/EFIS
rm -rf bin lib lib64 include share pyvenv.cfg
virtualenv .
source bin/activate
pip install -r ~/requirements.txt
deactivate
```

### 5. Deploy the updated service file

The updated `piefis.service` was already committed to the repo. Copy it into place:

```bash
sudo cp ~/EFIS/linux/piefis.service /etc/systemd/system/piefis.service
sudo systemctl daemon-reload
```

### 6. Start the service and verify

```bash
sudo systemctl start piefis
sudo systemctl status piefis
```

Check the log if needed:

```bash
tail -f /var/log/piefis.log
```

### 7. Clean up

```bash
rm ~/requirements.txt
```

## Rollback

If something goes wrong, reverse the rename and restart:

```bash
sudo systemctl stop piefis
mv ~/EFIS ~/Python_Avionics
sudo cp ~/Python_Avionics/linux/piefis.service /etc/systemd/system/piefis.service
sudo systemctl daemon-reload
sudo systemctl start piefis
```

Note: The rollback uses the old service file that's still in the linux/ directory from before the commit. If you've already deployed the new one via `copytopiefis.sh`, you'd need to restore the old service file manually.
