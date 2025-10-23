@echo off
cls
echo ========================================
echo   Iniciando AgendaSalud (SIN Docker)
echo ========================================
echo.

REM Mata procesos previos
taskkill /F /IM dotnet.exe 2>nul
timeout /t 2 /nobreak >nul

echo [1/4] Iniciando Auth Service en puerto 5001...
start "Auth API - Port 5001" cmd /k "cd /d D:\Proyectos\AgendaSaludApp\AS.AuthService\AuthService.API && dotnet run --urls http://localhost:5001"
timeout /t 5 /nobreak >nul

echo [2/4] Iniciando Appointment Service en puerto 5002...
start "Appointment API - Port 5002" cmd /k "cd /d D:\Proyectos\AgendaSaludApp\AS.AppointmentService\AS.AppointmentService.Api && dotnet run --urls http://localhost:5002"
timeout /t 5 /nobreak >nul

echo [3/4] Iniciando UserManagement Service en puerto 5003...
start "UserManagement API - Port 5003" cmd /k "cd /d D:\Proyectos\AgendaSaludApp\AS.Usermanagement\AS.UserManagement.Api && dotnet run --urls http://localhost:5003"
timeout /t 5 /nobreak >nul

echo [4/4] Iniciando Notification Service en puerto 5005...
start "Notification API - Port 5005" cmd /k "cd /d D:\Proyectos\AgendaSaludApp\AS.NotificationService\Api && dotnet run --urls http://localhost:5005"

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Servicios iniciados correctamente
echo ========================================
echo.
echo URLs disponibles:
echo   Auth:          http://localhost:5001/swagger
echo   Appointment:   http://localhost:5002/swagger
echo   UserMgmt:      http://localhost:5003/swagger
echo   Notification:  http://localhost:5005/swagger
echo.
echo Presiona cualquier tecla para DETENER todos los servicios...
pause >nul

echo.
echo Deteniendo servicios...
taskkill /F /IM dotnet.exe
echo Servicios detenidos.
pause