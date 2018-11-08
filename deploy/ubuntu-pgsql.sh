#!/bin/bash
sudo apt update;
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
cd /ias
sudo npm install pg
