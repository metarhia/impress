#!/bin/bash
sudo dnf -y install postgresql-server postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo postgresql-setup initdb
cd /ias
sudo npm install pg
