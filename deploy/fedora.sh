#!/bin/bash
dnf -y update
dnf -y install wget mc
dnf -y install psmisc
dnf -y groupinstall "Development Tools"
curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
dnf -y install nodejs
cd ~
cat >/etc/yum.repos.d/mongodb.repo <<EOL
[mongodb]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7Server/mongodb-org/stable/x86_64/
gpgcheck=0
enabled=1
EOL
sudo dnf install -y mongodb-org
service mongod start
chkconfig mongod on
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
