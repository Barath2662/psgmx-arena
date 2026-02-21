@echo off
REM PSGMX Arena - Development Server Launcher (Windows)
REM Starts Next.js client and Socket.IO server in separate terminal windows
REM Using Supabase for database and auth (no local Docker required)

title PSGMX Arena Development

echo.
echo ==========================================
echo   PSGMX Arena - Local Development
echo ==========================================
echo.
echo   DB:     Supabase PostgreSQL (remote)
echo   Auth:   Supabase Auth (remote)
echo   Client: http://localhost:3000 (Next.js)
echo   Server: http://localhost:3001 (Socket.IO)
echo.
echo Press Ctrl+C in either terminal to stop individual servers
echo Close all terminals to stop development
echo.

REM Start Next.js client on port 3000 in a new window
start "PSGMX Arena - Client (Next.js)" npm run dev:client

REM Give client a moment to start
timeout /t 3 /nobreak >nul

REM Start Socket.IO server on port 3001 in a new window
start "PSGMX Arena - Server (Socket.IO)" npm run dev:server

echo.
echo   [OK] Both servers starting...
echo   Client: http://localhost:3000
echo   Server: http://localhost:3001
echo.
