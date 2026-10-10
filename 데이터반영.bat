@echo off
chcp 65001 >nul
title GUJERO - 데이터 동기화 프로그램 (클라우드 전용)
color 0B

echo.
echo ==========================================================
echo    GUJERO 홈페이지 데이터 동기화 (Google Drive 연동)
echo ==========================================================
echo.
echo    [작업 순서]
echo    1. 라이브 홈페이지(운영서버)에 최신 시트 데이터 동기화 요청
echo.
echo ==========================================================
echo.

echo ==========================================
echo 라이브 서버 데이터 동기화 진행 중...
echo ==========================================
curl.exe -s --max-time 600 "https://www.gujero.com/api/sync"
echo.
if errorlevel 1 (
    echo.
    echo [경고] 1차 동기화 실패. 30초 후 재시도합니다...
    timeout /t 30 /nobreak >nul
    curl.exe -s --max-time 600 "https://www.gujero.com/api/sync"
    echo.
)

echo.
echo ==========================================
echo  동기화 요청이 완료되었습니다! 
echo  홈페이지: https://www.gujero.com
echo ==========================================
