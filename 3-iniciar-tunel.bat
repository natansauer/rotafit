@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Iniciando o Expo em modo TUNEL (funciona mesmo com o celular em outra rede).
echo Se perguntar para instalar @expo/ngrok, responda Y.
call npx expo start -c --tunnel
pause
