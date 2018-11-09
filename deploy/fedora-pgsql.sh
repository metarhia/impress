#!/bin/bash
sudo dnf -y install postgresql postgresql-server postgresql-contrib
sudo postgresql-setup --initdb --unit postgresql
sudo systemctl enable --now postgresql
cd /ias
sudo npm install pg
