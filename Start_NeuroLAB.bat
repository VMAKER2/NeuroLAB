@echo off
title NeuroLAB Launcher
cd /d "C:\NeuroLAB"

echo Checking if server is already running...
netstat -ano | findstr :5173 >nul
if %errorlevel% neq 0 (
    echo Starting NeuroLAB local server...
    start /b python -m http.server 5173 --bind 127.0.0.1
    timeout /t 2 /nobreak >nul
) else (
    echo Server is already active on port 5173.
)

echo Opening browser...
start "" "http://127.0.0.1:5173/#/"

