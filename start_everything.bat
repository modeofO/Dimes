@echo off
echo Starting backend, api-server, and client...

REM Start the executable in a new window
start "Backend" "server\build\Release\cad-server.exe"

REM Start first npm run dev in a new window
start "Api-server" cmd /k "cd /d api-server && bun run dev"

REM Start second npm run dev in a new window  
start "Client" cmd /k "cd /d client && bun run dev"

echo All processes started!
pause