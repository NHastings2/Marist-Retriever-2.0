# Marist Job Retriever
[![Docker Build](https://github.com/NHastings2/Marist-Retriever-2.0/actions/workflows/main.yml/badge.svg)](https://github.com/NHastings2/Marist-Retriever-2.0/actions/workflows/main.yml)

The Marist Job Retriever web application is designed to interface with the Marist University IBM Z/OS Mainframe to allow for the easy listing, retrieval, and formatting of JES job output files. 

[Docker Image](https://hub.docker.com/repository/docker/hastingsn25/marist-app/general)


#Docker Compose
```yaml
version: '3.4'
services:
  marist-app:
    image: hastingsn25/marist-app
    build: .
    environment:
      NODE_ENV: production
    ports:
      - 80:3001
```
