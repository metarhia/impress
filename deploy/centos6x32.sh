#!/bin/bash
yum -y update
yum -y install wget mc
sudo wget -O /etc/yum.repos.d/slc6-devtoolset.repo http://linuxsoft.cern.ch/cern/devtoolset/slc6-devtoolset.repo
sudo rpm --import http://ftp.scientificlinux.org/linux/scientific/5x/x86_64/RPM-GPG-KEYs/RPM-GPG-KEY-cern
sudo yum -y install devtoolset-2
source scl_source enable devtoolset-2
curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
yum -y install nodejs
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
