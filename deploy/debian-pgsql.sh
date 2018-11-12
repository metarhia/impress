#!/bin/bash
RELEASE=$(lsb_release -sc)
sudo apt update
sudo apt install -y curl ca-certificates
curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo sh -c "echo \"deb http://apt.postgresql.org/pub/repos/apt/ $RELEASE-pgdg main\" >> /etc/apt/sources.list.d/pgdg.list"
sudo apt update
sudo apt install -y postgresql postgresql-contrib
# No need to enable and start postgresql.service, because it is enabled and started by default
cd /ias
sudo npm install pg
