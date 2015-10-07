#!/bin/bash
apt-get -y update
apt-get -y install mc
apt-get -y install wget
apt-get -y install build-essential openssl libssl-dev pkg-config
apt-get -y install python
cd /usr/src
wget http://nodejs.org/dist/v4.1.2/node-v4.1.2.tar.gz
tar zxf node-v4.1.2.tar.gz
rm -f ./node-v4.1.2.tar.gz
cd node-v4.1.2
./configure
make
make install
cd ~
rm -rf /usr/src/node-v4.1.2
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
