@echo off
chcp 65001 >nul
cd /d "%~dp0"
findstr /c:"SEU-PROJETO" ".env" >nul 2>nul
if not errorlevel 1 (
  echo [ATENCAO] O .env ainda tem os valores de exemplo. Preencha suas chaves antes.
  pause
  exit /b 1
)
echo Iniciando o Expo. Escaneie o QR Code com o app Expo Go no celular.
call npx expo start -c
pause
