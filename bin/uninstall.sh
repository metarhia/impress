#!/bin/sh
service impress stop
chkconfig impress off
chkconfig --del impress
rm /etc/init.d/impress
