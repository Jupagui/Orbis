@echo off
color 0A
echo ===================================================
echo     INICIADOR AUTOMATICO DE ORBIS (IA CIVICA)
echo ===================================================
echo.

echo [1/4] Preparando entorno Backend (Python)...
cd backend
if not exist venv (
    echo Creando entorno virtual de Python (venv)...
    python -m venv venv
)
echo Activando entorno virtual...
call .\venv\Scripts\activate
echo Instalando y actualizando dependencias del Backend...
pip install -r requirements.txt
cd ..

echo.
echo [2/4] Preparando entorno Frontend (Node.js)...
cd frontend
echo Instalando librerias del Frontend (esto puede tomar unos minutos)...
call npm install
cd ..

echo.
echo [3/4] Levantando servidor Backend (FastAPI)...
start "ORBIS Backend" cmd /k "color 0B && cd backend && call .\venv\Scripts\activate && echo Levantando Backend en puerto 8000... && uvicorn app.main:app --reload"

echo.
echo [4/4] Levantando servidor Frontend (React/Vite)...
start "ORBIS Frontend" cmd /k "color 0E && cd frontend && echo Levantando Frontend en puerto 5173... && npm run dev"

echo.
echo ===================================================
echo        INSTALACION Y LANZAMIENTO COMPLETADOS       
echo ===================================================
echo.
echo - El servidor Backend y Frontend se abrieron en nuevas ventanas negras.
echo - No cierres esas ventanas mientras estes usando la aplicacion.
echo.
echo Accede a la plataforma web aqui: http://localhost:5173
echo.
pause
