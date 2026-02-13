#!/bin/bash
# PSGMX Arena - Development Server Launcher (macOS/Linux)
# Starts both Next.js frontend and Socket.IO backend in the same terminal with color coding

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
echo "   PSGMX Arena - Starting Development"
echo "=========================================="
echo -e "${NC}"
echo ""
echo -e "${BLUE}📦 Frontend:${NC} Next.js on ${BLUE}http://localhost:3000${NC}"
echo -e "${BLUE}⚡ Backend:${NC}  Socket.IO on ${BLUE}http://localhost:3001${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo -e "${RED}Stopping servers...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

# Give frontend a moment to start
sleep 2

# Start backend in background
npm run socket:dev &
BACKEND_PID=$!

echo -e "${GREEN}✓ Both servers starting...${NC}"
echo ""

# Wait for both processes
wait
