#!/bin/bash
yum -y update
yum -y install wget mc
yum -y install psmisc
yum -y groupinstall "Development Tools"
curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
yum -y install nodejs
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
