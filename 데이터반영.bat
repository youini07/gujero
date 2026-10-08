@echo off
title GUJERO - 데이터 동기화 프로그램 (리뉴얼 버전)
color 0B

echo.
echo ==========================================================
echo    GUJERO 데이터베이스 및 클라우드 이미지 동기화
echo ==========================================================
echo.
echo    [작업 내용]
echo    1. 구글 시트에서 최신 데이터베이스(DB) 가져오기
echo    2. 누끼 썸네일 및 원본 사진을 클라우드 서버(R2)에 업로드
echo    3. 라이브 홈페이지(운영서버)에 업데이트 명령 전송
echo.
echo ==========================================================
echo.

echo.
echo ==========================================
echo [1/3] 구글 시트 데이터 로컬 DB 반영 중...
echo ==========================================
py server\migrate_data.py
if errorlevel 1 (
    echo [에러] 데이터 다운로드 실패.
    exit /b 1
)
echo.

echo ==========================================
echo [2/3] 클라우드(R2) 이미지 동기화 중...
echo ==========================================
py server\sync_r2.py --mode fast
if errorlevel 1 (
    echo [에러] 이미지 클라우드 동기화 실패.
    exit /b 1
)
echo.

echo ==========================================
echo [3/3] 라이브 서버 데이터 동기화 중...
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
echo  업데이트가 완료되었습니다! 
echo  홈페이지: https://www.gujero.com
echo ==========================================
