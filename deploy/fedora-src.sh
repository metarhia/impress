#!/bin/bash
dnf -y update
dnf -y install wget mc gcc-c++
dnf -y install psmisc
dnf -y groupinstall "Development Tools"
cd /usr/src
wget https://nodejs.org/dist/v8.1.2/node-v8.1.2.tar.gz
tar zxf node-v8.1.2.tar.gz
rm -f ./node-v8.1.2.tar.gz
cd node-v8.1.2
./configure
make
make install
cd ~
rm -rf /usr/src/node-v8.1.2
ln -s /usr/local/bin/node /bin
ln -s /usr/local/bin/npm /bin
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
