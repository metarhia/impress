#!/bin/bash
RELEASE=$(lsb_release -sc)
sudo apt-get -y update
sudo apt-get -y install wget mc
sudo apt-get -y install build-essential openssl libssl-dev pkg-config python
if [ $RELEASE = 'precise' ]; then
sudo apt-get -y install python-software-properties
sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test
sudo apt-get -y update
sudo apt-get -y install g++-4.8
sudo update-alternatives --quiet --install  /usr/bin/g++ g++ /usr/bin/g++-4.8 1
fi
cd /usr/src
sudo wget http://nodejs.org/dist/v6.2.1/node-v6.2.1.tar.gz
sudo tar zxf node-v6.2.1.tar.gz
sudo rm -f ./node-v6.2.1.tar.gz
cd node-v6.2.1
sudo ./configure
sudo make
sudo make install
cd ~
sudo rm -rf /usr/src/node-v6.2.1
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
