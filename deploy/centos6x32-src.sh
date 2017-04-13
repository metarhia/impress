#!/bin/bash
yum -y update
yum -y install wget mc
sudo wget -O /etc/yum.repos.d/slc6-devtoolset.repo http://linuxsoft.cern.ch/cern/devtoolset/slc6-devtoolset.repo
sudo rpm --import http://ftp.scientificlinux.org/linux/scientific/5x/x86_64/RPM-GPG-KEYs/RPM-GPG-KEY-cern
sudo yum -y install devtoolset-2
source scl_source enable devtoolset-2
cd /usr/src
wget https://nodejs.org/dist/v7.9.0/node-v7.9.0.tar.gz
tar zxf node-v7.9.0.tar.gz
rm -f ./node-v7.9.0.tar.gz
cd node-v7.9.0
./configure
make
make install
cd ~
rm -rf /usr/src/node-v7.9.0
ln -s /usr/local/bin/node /bin
ln -s /usr/local/bin/npm /bin
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
