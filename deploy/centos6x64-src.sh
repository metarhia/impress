#!/bin/bash
yum -y update
yum -y install wget mc
yum -y groupinstall "Development Tools"
sudo curl http://linuxsoft.cern.ch/cern/scl/slc6-scl.repo > /etc/yum.repos.d/slc6-scl.repo
rpm --import http://ftp.mirrorservice.org/sites/ftp.scientificlinux.org/linux/scientific/51/i386/RPM-GPG-KEYs/RPM-GPG-KEY-cern
yum -y install devtoolset-3
source scl_source enable devtoolset-3
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
ln -s /usr/local/bin/node /bin
ln -s /usr/local/bin/npm /bin
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
