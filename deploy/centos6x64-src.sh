#!/bin/bash
yum -y update
yum -y install wget mc
yum -y groupinstall "Development Tools"
sudo curl http://linuxsoft.cern.ch/cern/scl/slc6-scl.repo > /etc/yum.repos.d/slc6-scl.repo
rpm --import http://ftp.mirrorservice.org/sites/ftp.scientificlinux.org/linux/scientific/51/i386/RPM-GPG-KEYs/RPM-GPG-KEY-cern
yum -y install devtoolset-3
source scl_source enable devtoolset-3
cd /usr/src
wget http://nodejs.org/dist/v6.2.1/node-v6.2.1.tar.gz
tar zxf node-v6.2.1.tar.gz
rm -f ./node-v6.2.1.tar.gz
cd node-v6.2.1
./configure
make
make install
cd ~
rm -rf /usr/src/node-v6.2.1
ln -s /usr/local/bin/node /bin
ln -s /usr/local/bin/npm /bin
cat >/etc/yum.repos.d/mongodb.repo <<EOL
[mongodb]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/6Server/mongodb-org/stable/x86_64/
gpgcheck=0
enabled=1
EOL
sudo yum -y install mongodb-org
service mongod start
chkconfig mongod on
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
