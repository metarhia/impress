#!/bin/bash
yum -y update
yum -y install wget mc
yum -y groupinstall "Development Tools"
curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
yum -y install nodejs
cd ~
cat >/etc/yum.repos.d/mongodb.repo <<EOL
[mongodb]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/6Server/mongodb-org/stable/x86_64/
gpgcheck=0
enabled=1
EOL
sudo yum install -y mongodb-org
service mongod start
chkconfig mongod on
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
