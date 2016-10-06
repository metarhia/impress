#!/bin/bash
sudo dnf install -y mongodb-server
service mongod start
chkconfig mongod on
