#!/bin/bash
yum -y update
yum -y install wget mc
yum -y install psmisc
yum -y groupinstall "Development Tools"
cd /usr/src
wget http://nodejs.org/dist/v6.6.0/node-v6.6.0.tar.gz
tar zxf node-v6.6.0.tar.gz
rm -f ./node-v6.6.0.tar.gz
cd node-v6.6.0
./configure
make
make install
cd ~
rm -rf /usr/src/node-v6.6.0
ln -s /usr/local/bin/node /bin
ln -s /usr/local/bin/npm /bin
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
