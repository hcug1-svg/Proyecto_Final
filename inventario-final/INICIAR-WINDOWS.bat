@echo off
setlocal
cd /d "%~dp0"
title StockFlow - Proyecto Final
echo ========================================
echo   StockFlow - Sistema de Inventario
echo ========================================
echo.
where docker >nul 2>&1
if errorlevel 1 (
  echo No se encontro Docker. Instala Docker Desktop y vuelve a intentarlo.
  pause
  exit /b 1
)
docker info >nul 2>&1
if errorlevel 1 (
  echo Abre Docker Desktop, espera a que termine de iniciar y vuelve a intentarlo.
  pause
  exit /b 1
)
echo Preparando aplicacion y base de datos MySQL...
docker compose up --build -d
if errorlevel 1 (
  echo Ocurrio un error al iniciar. Revisa el resultado anterior.
  pause
  exit /b 1
)
echo.
echo Proyecto iniciado. Abriendo http://localhost:3000
start "" "http://localhost:3000"
echo.
echo Para detenerlo: docker compose down
pause
