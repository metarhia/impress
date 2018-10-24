#!/bin/bash
RELEASE=$(lsb_release -sc)
sudo apt-get -y update
sudo apt-get -y install wget mc curl
sudo apt-get -y install build-essential openssl libssl-dev pkg-config python
sudo apt-get -y install software-properties-common
sudo add-apt-repository -y ppa:certbot/certbot
sudo apt-get -y update
sudo apt-get -y install certbot
curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
sudo apt-get -y install nodejs
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
echo 'To generate certificates run "certbot certonly" under root'
