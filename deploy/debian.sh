#!/bin/bash
apt-get -y update
apt-get -y install mc
apt-get -y install wget
apt-get -y install build-essential openssl libssl-dev pkg-config
apt-get -y install python
cd /usr/src
wget http://nodejs.org/dist/v0.10.32/node-v0.10.32.tar.gz
tar zxf node-v0.10.32.tar.gz
rm ./node-v0.10.32.tar.gz
cd node-v0.10.32
./configure
make
make install
cd ~
rm -rf /usr/src/node-v0.10.32
echo 'deb http://downloads-distro.mongodb.org/repo/debian-sysvinit dist 10gen' | tee /etc/apt/sources.list.d/mongodb.list
apt-get -y update
apt-get -y --force-yes install mongodb-org
service mongod start
update-rc.d mongod defaults
mkdir /impress
cd /impress
npm install mongodb
npm install nodemailer
npm install websocket
npm install geoip-lite
npm install impress
