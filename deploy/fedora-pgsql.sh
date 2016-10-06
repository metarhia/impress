#!/bin/bash
sudo dnf install postgresql-server
sudo service postgresql initdb
sudo chkconfig postgresql on
cd /ias
sudo npm install pg
