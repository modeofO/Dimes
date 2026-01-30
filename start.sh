#!/bin/bash

# OBSOLETE FOR NEW PYTHON BACKEND

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Dimes Application...${NC}"

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Start the CAD server (Python)
echo -e "${BLUE}Starting CAD Server...${NC}"
cd server/build
./cad-server &
CAD_SERVER_PID=$!
cd ../..

# Start the API server
echo -e "${BLUE}Starting API Server...${NC}"
cd api-server
bun dev &
API_SERVER_PID=$!
cd ..

# Start the client
echo -e "${BLUE}Starting Client...${NC}"
cd client
bun dev &
CLIENT_PID=$!
cd ..

echo -e "${GREEN}All services started!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for all background processes
wait 