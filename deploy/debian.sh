#!/bin/bash
RELEASE=$(lsb_release -sc)
apt-get install sudo
sudo apt-get -y update
sudo apt-get -y install wget mc curl
sudo apt-get -y install build-essential openssl libssl-dev pkg-config
sudo apt-get -y install python
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get -y install nodejs
sudo mkdir /ias
cd /ias
curl -O https://dl.eff.org/certbot-auto
chmod a+x certbot-auto
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
echo 'To generate certificates run "/ias/certbot-auto certonly" under root'
