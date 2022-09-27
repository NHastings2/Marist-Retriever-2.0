#!/bin/bash

##Stop Service
sudo systemctl stop marist

#Update REPO
git stash
git pull

## Make the JS file executable
cd ./server
sudo chmod +x index.js
cd ..

##Build new Website
npm run build

##Restart Service
sudo systemctl start marist

##Chmod update script
sudo chmod +x update.sh
