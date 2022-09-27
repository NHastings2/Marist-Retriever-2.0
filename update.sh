#!/bin/bash

##Stop Service
sudo systemctl stop marist

#Update REPO
git stash
git pull

## Make the JS file executable
cd ./server
sudo chmox +x index.js
cd ..

##Build new Website
npm run build

##Restart Service
sudo systemctl start marist
