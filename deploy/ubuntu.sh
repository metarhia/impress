#!/bin/bash
RELEASE=$(lsb_release -sc)
sudo apt-get -y update
sudo apt-get -y install wget mc curl
sudo apt-get -y install build-essential openssl libssl-dev pkg-config python
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
cd ~
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
if [ $RELEASE = 'wily' ]; then
echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb.list
else
echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb.list
fi
sudo apt-get -y update
sudo apt-get -y install mongodb-org
sudo service mongod start
sudo update-rc.d mongod defaults
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
