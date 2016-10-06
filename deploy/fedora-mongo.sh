#!/bin/bash
sudo dnf install -y mongodb-server
sudo service mongod start
sudo chkconfig mongod on
cd /ias
sudo npm install mongodb
