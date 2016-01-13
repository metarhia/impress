#!/bin/bash
sudo apt-get -y update
sudo apt-get -y install mc
sudo apt-get -y install wget
sudo apt-get -y install build-essential openssl libssl-dev pkg-config python
cd /usr/src
sudo wget http://nodejs.org/dist/v5.4.1/node-v5.4.1.tar.gz
sudo tar zxf node-v5.4.1.tar.gz
sudo rm -f ./node-v5.4.1.tar.gz
cd node-v5.4.1
sudo ./configure
sudo make
sudo make install
cd ~
sudo rm -rf /usr/src/node-v5.4.1
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get -y update
sudo apt-get -y --force-yes install mongodb-org
sudo service mongod start
sudo update-rc.d mongod defaults
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
