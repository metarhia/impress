#!/bin/bash
dnf -y update
dnf -y install wget mc gcc-c++
dnf -y install psmisc
dnf -y groupinstall "Development Tools"
dnf -y install certbot
curl --silent --location https://rpm.nodesource.com/setup_10.x | bash -
dnf -y install nodejs
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
echo 'To generate certificates run "certbot certonly" under root'
