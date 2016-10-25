#!/bin/bash
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
cd /ias
sudo npm install mongodb
