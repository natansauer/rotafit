@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   RotaFit - instalacao
echo ================================================
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado.
  echo Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo Node encontrado: %%v
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Arquivo .env criado a partir do .env.example - preencha suas chaves nele.
)
echo.
echo [1/3] Instalando dependencias (npm install)...
call npm install
if errorlevel 1 goto erro
echo.
echo [2/3] Alinhando versoes com o Expo (npx expo install --fix)...
call npx expo install --fix
if errorlevel 1 goto erro
echo.
echo [3/3] Rodando os testes (npm test)...
call npm test
if errorlevel 1 goto erro
echo.
echo ================================================
echo   Tudo certo! Agora preencha o .env e rode 2-iniciar.bat
echo ================================================
pause
exit /b 0
:erro
echo.
echo [ERRO] Algo falhou acima. Tire um print desta janela e mande no chat.
pause
exit /b 1
