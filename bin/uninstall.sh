#!/bin/sh
service impress stop
if [ -f /etc/debian_version ]; then
	sudo update-rc.d impress disable
elif [ -f /etc/redhat-release ]; then
  chkconfig impress off
  chkconfig --del impress
  rm /etc/init.d/impress
fi
