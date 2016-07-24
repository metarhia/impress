#!/bin/bash
RELEASE=$(lsb_release -sc)
apt-get install sudo
sudo apt-get -y update
sudo apt-get -y install wget mc curl
sudo apt-get -y install build-essential openssl libssl-dev pkg-config
sudo apt-get -y install python
if [ $RELEASE = 'wheezy' ]; then
sed -i 's/wheezy/jessie/g' /etc/apt/sources.list
sudo apt-get -y update
sudo DEBIAN_FRONTEND='noninteractive' apt-get -y install g++
sed -i 's/jessie/wheezy/g' /etc/apt/sources.list
sudo apt-get -y update
else
sudo apt-get -y install g++
fi
cd /usr/src
wget http://nodejs.org/dist/v6.3.1/node-v6.3.1.tar.gz
tar zxf node-v6.3.1.tar.gz
rm -f ./node-v6.3.1.tar.gz
cd node-v6.3.1
./configure
make
make install
cd ~
rm -rf /usr/src/node-v6.3.1
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
