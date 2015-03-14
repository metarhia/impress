#!/bin/sh
cp /impress/node_modules/impress/bin/impress /etc/init.d
chmod +x /etc/init.d/impress
if [ -f /etc/debian_version ]; then
  sudo update-rc.d impress defaults
elif [ $(pidof systemd) -eq 1 ]; then
  cp /impress/node_modules/impress/bin/impress.service /etc/systemd/system
  systemctl daemon-reload
  systemctl enable impress
elif [ -f /etc/redhat-release ]; then
  chkconfig --add impress
  chkconfig impress on
fi
