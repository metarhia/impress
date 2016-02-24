#!/bin/bash
apt-get -y update
apt-get -y install wget mc
apt-get -y install build-essential openssl libssl-dev pkg-config
apt-get -y install python
sed -i 's/wheezy/jessie/g' /etc/apt/sources.list
apt-get -y update
export DEBIAN_FRONTEND='noninteractive'
apt-get -y install g++-4.8
sed -i 's/wheezy/jessie/g' /etc/apt/sources.list
apt-get -y update
export DEBIAN_FRONTEND=''
cd /usr/src
wget http://nodejs.org/dist/v5.7.0/node-v5.7.0.tar.gz
tar zxf node-v5.7.0.tar.gz
rm -f ./node-v5.7.0.tar.gz
cd node-v5.7.0
./configure
make
make install
cd ~
rm -rf /usr/src/node-v5.7.0
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
echo "deb http://repo.mongodb.org/apt/debian wheezy/mongodb-org/3.2 main" | sudo tee /etc/apt/sources.list.d/mongodb.list
apt-get -y update
sudo apt-get -y install mongodb-org
service mongod start
update-rc.d mongod defaults
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
