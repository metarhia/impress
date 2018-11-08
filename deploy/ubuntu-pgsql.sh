#!/bin/bash
sudo apt update;
sudo apt install -y postgresql postgresql-contrib
# No need to enable and start postgresql.service, because it is enabled and started by default
cd /ias
sudo npm install pg
