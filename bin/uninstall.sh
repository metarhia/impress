#!/bin/sh
service impress stop
if [ -f /etc/debian_version ]; then
	sudo update-rc.d impress disable
elif [ $(pidof systemd) -eq 1 ]; then
  systemctl disable impress
  rm /etc/systemd/system/impress.service
elif [ -f /etc/redhat-release ]; then
  chkconfig impress off
  chkconfig --del impress
  rm /etc/init.d/impress
fi
