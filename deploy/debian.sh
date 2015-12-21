#!/bin/bash
apt-get -y update
apt-get -y install mc
apt-get -y install wget
apt-get -y install build-essential openssl libssl-dev pkg-config
apt-get -y install python
cd /usr/src
wget http://nodejs.org/dist/v5.3.0/node-v5.3.0.tar.gz
tar zxf node-v5.3.0.tar.gz
rm -f ./node-v5.3.0.tar.gz
cd node-v5.3.0
./configure
make
make install
cd ~
rm -rf /usr/src/node-v5.3.0
echo 'deb http://downloads-distro.mongodb.org/repo/debian-sysvinit dist 10gen' | tee /etc/apt/sources.list.d/mongodb.list
apt-get -y update
apt-get -y --force-yes install mongodb-org
service mongod start
update-rc.d mongod defaults
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
