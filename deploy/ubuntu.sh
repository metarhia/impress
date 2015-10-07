#!/bin/bash
sudo apt-get -y update
sudo apt-get -y install mc
sudo apt-get -y install wget
sudo apt-get -y install build-essential openssl libssl-dev pkg-config python
cd /usr/src
sudo wget http://nodejs.org/dist/v4.1.2/node-v4.1.2.tar.gz
sudo tar zxf node-v4.1.2.tar.gz
sudo rm -f ./node-v4.1.2.tar.gz
cd node-v4.1.2
sudo ./configure
sudo make
sudo make install
cd ~
sudo rm -rf /usr/src/node-v4.1.2
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get -y update
sudo apt-get -y --force-yes install mongodb-org
sudo service mongod start
sudo update-rc.d mongod defaults
mkdir /impress
cd /impress
sudo npm install mongodb
sudo npm install nodemailer
sudo npm install websocket
sudo npm install geoip-lite
sudo npm install impress
