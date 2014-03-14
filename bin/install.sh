#!/bin/sh
cp /impress/node_modules/impress/bin/impress /etc/init.d
chmod +x /etc/init.d/impress
chkconfig --add impress
chkconfig impress on
