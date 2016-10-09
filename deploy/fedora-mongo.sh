#!/bin/bash
sudo dnf install -y mongodb-server
sudo systemctl enable mongod
sudo systemctl start mongod
cd /ias
sudo npm install mongodb
