@echo off
cd /d "%~dp0"

echo ===========================================================
echo [1/3] Frontend Client Starting (Port: 4822)...
echo ===========================================================
start "Frontend Client" cmd /k "cd client && npm run dev"

echo [2/3] Waiting for server 3 seconds...
ping 127.0.0.1 -n 4 > nul

echo [3/3] Opening local homepage (http://localhost:4822)...
start http://localhost:4822

echo ===========================================================
echo [Backend Server] Backend runs here. (Port: 5822)
echo ===========================================================
cd server
set PORT=5822
npm start

echo Backend server closed. Check error messages.
pause
