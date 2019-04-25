#!/bin/bash
RELEASE=$(lsb_release -sc)
apt-get install sudo
sudo apt-get -y update
sudo apt-get -y install wget mc curl
sudo apt-get -y install smartmontools
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
wget https://nodejs.org/dist/v12.0.0/node-v12.0.0.tar.gz
tar zxf node-v12.0.0.tar.gz
rm -f ./node-v12.0.0.tar.gz
cd node-v12.0.0
./configure
make
make install
cd ~
rm -rf /usr/src/node-v12.0.0
sudo mkdir /ias
cd /ias
curl -O https://dl.eff.org/certbot-auto
chmod a+x certbot-auto
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
echo 'To generate certificates run "/ias/certbot-auto certonly" under root'
