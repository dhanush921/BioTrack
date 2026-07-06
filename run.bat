@echo off
title BioTrack Control Center
echo ========================================================
echo   BIOTRACK - SMART BIOMEDICAL EQUIPMENT MANAGEMENT SYSTEM
echo ========================================================
echo.
echo [1/2] Installing root node modules...
call npm.cmd install --no-audit --no-fund

echo [2/2] Bootstrapping servers...
echo Dev Server Launching at http://localhost:5173
echo.
call npm.cmd run dev
pause
