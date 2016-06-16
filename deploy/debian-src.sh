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
wget http://nodejs.org/dist/v6.2.1/node-v6.2.1.tar.gz
tar zxf node-v6.2.1.tar.gz
rm -f ./node-v6.2.1.tar.gz
cd node-v6.2.1
./configure
make
make install
cd ~
rm -rf /usr/src/node-v6.2.1
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
echo "deb http://repo.mongodb.org/apt/debian wheezy/mongodb-org/3.2 main" | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get -y update
sudo apt-get -y install mongodb-org
sudo service mongod start
sudo update-rc.d mongod defaults
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
