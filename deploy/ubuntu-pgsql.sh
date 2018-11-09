#!/bin/bash
sudo apt update;
sudo apt install -y postgresql postgresql-contrib
cd /ias
sudo npm install pg
