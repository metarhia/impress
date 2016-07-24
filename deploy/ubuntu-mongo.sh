#!/bin/bash
RELEASE=$(lsb_release -sc)
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
