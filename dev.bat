@echo off
REM PSGMX Arena - Development Server Launcher (Windows)
REM Starts both Next.js frontend and Socket.IO backend in separate terminal windows

title PSGMX Arena Development

echo.
echo ==========================================
echo   PSGMX Arena - Starting Development
echo ==========================================
echo.
echo Starting Next.js frontend on http://localhost:3000
echo Starting Socket.IO backend on http://localhost:3001
echo.
echo Press Ctrl+C in either terminal to stop individual servers
echo Close all terminals to stop development
echo.

REM Start frontend on port 3000 in a new window
start "PSGMX Arena - Frontend" npm run dev

REM Give frontend a moment to start
timeout /t 2 /nobreak

REM Start backend on port 3001 in a new window
start "PSGMX Arena - Socket.IO" npm run socket:dev

echo.
echo ✓ Both servers starting...
echo.
