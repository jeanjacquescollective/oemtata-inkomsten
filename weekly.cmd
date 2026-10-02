@echo off
rem Haalt de nieuwe transacties op, bouwt de site-data en publiceert.
rem Bedoeld voor Windows Taakplanner (elke maandag).
cd /d "%~dp0"
call npm run weekly >> reports\weekly.log 2>&1 || exit /b 1
call npm run publish >> reports\weekly.log 2>&1
