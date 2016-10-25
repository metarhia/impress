#!/bin/bash
dnf -y update
dnf -y install wget mc
dnf -y install psmisc
dnf -y groupinstall "Development Tools"
curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
dnf -y install nodejs
sudo mkdir /ias
cd /ias
sudo npm install nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
