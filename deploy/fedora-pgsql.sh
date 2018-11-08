#!/bin/bash
sudo dnf -y install postgresql postgresql-server postgresql-contrib
sudo systemctl enable postgresql
sudo postgresql-setup --initdb --unit postgresql
sudo systemctl start postgresql
cd /ias
sudo npm install pg
