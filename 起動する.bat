@echo off
chcp 65001 > nul
echo ====================================================
echo   はぁもにぃ - 日誌・看護記録音声入力システム 起動スクリプト
echo ====================================================

echo [1/2] バックエンド (FastAPI) を別ウィンドウで起動します...
start "Harmony Backend (FastAPI)" cmd /k "cd backend && python main.py"

echo [2/2] フロントエンド (Vite/React) を別ウィンドウで起動します...
start "Harmony Frontend (Vite)" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo ====================================================
echo   両方のサーバーを起動しました。
echo   自動的にブラウザが開かない場合は、以下にアクセスしてください:
echo   http://localhost:5173
echo ====================================================
pause
