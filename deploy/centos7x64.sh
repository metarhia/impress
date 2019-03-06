#!/bin/bash
yum -y update
yum -y install wget mc
yum -y install psmisc
yum -y install smartmontools
yum -y groupinstall "Development Tools"
yum -y install epel-release
yum -y install certbot
curl --silent --location https://rpm.nodesource.com/setup_11.x | bash -
yum -y install nodejs
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
echo 'To generate certificates run "certbot certonly" under root'
