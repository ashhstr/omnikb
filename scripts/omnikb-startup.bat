@echo off
:: ============================================================
:: OmniKB Auto-Start Service (Windows)
:: Starts watcher + REST API + MCP server in background
:: ============================================================

:: Kill any existing OmniKB instances to prevent port collision
tasklist /FI "WINDOWTITLE eq OmniKB-Service*" 2>NUL | find /I "node.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    taskkill /F /FI "WINDOWTITLE eq OmniKB-Service*" >NUL 2>&1
)

:: Switch to root repository directory
cd /d "%~dp0.."

:: Create logs directory if not exists
if not exist "%~dp0logs" mkdir "%~dp0logs"

:: Single command: serve starts watcher + REST API on port 7890
start "OmniKB-Service" /MIN node dist/cli.js serve --port 7890 > "%~dp0logs\omnikb-service.log" 2>&1
