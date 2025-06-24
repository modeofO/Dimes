# CAD Server - Python Rewrite Setup Guide

## Quick Start

### 1. Build and Start Development Environment
```bash
# Navigate to serverpy directory
cd serverpy

# Build the container
docker-compose build

# Start interactive development shell (running with port mapping)
docker-compose run --rm -p 8080:8080 dev bash

# Check running port mappings
docker ps
```


### 2. Inside the Container
```bash
# Activate conda environment (should auto-activate)
conda activate cad-env

# Run the CAD server
python main.py
```

### 3. Start Production Server
```bash
# Run the web server (from host)
docker-compose up cad-server
```

### 4. Stopping
```bash
# Stop the container
docker-compose down