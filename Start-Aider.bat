@echo off
cd /d "%~dp0\.."
echo === Aider Launcher ===
powershell -ExecutionPolicy Bypass -File "%~dp0Start-Aider.ps1" %*