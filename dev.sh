#!/bin/bash
# PSGMX Arena - Development Server Launcher (macOS/Linux)
# Starts Next.js client and Socket.IO server in the same terminal
# Using Supabase for database and auth (no local Docker required)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

clear

echo -e "${GREEN}"
echo "=========================================="
echo "   PSGMX Arena - Local Development"
echo "=========================================="
echo -e "${NC}"
echo ""
echo -e "   DB:     Supabase PostgreSQL (remote)"
echo -e "   Auth:   Supabase Auth (remote)"
echo -e "${BLUE}   Client:${NC} Next.js on ${BLUE}http://localhost:3000${NC}"
echo -e "${BLUE}   Server:${NC} Socket.IO on ${BLUE}http://localhost:3001${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo -e "${RED}Stopping servers...${NC}"
    kill $CLIENT_PID 2>/dev/null || true
    kill $SERVER_PID 2>/dev/null || true
    wait $CLIENT_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Start client (Next.js) in background
npm run dev:client &
CLIENT_PID=$!

# Give client a moment to start
sleep 3

# Start server (Socket.IO) in background
npm run dev:server &
SERVER_PID=$!

echo -e "${GREEN}✓ Both servers starting...${NC}"
echo ""

# Wait for both processes
wait
