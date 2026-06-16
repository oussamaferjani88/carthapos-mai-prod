@echo off
REM ==========================================================
REM Metabase Startup Script
REM Connects to local PostgreSQL (pos_system database)
REM ==========================================================

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

set MB_DB_TYPE=postgres
set MB_DB_DBNAME=metabase
set MB_DB_HOST=localhost
set MB_DB_PORT=5432
set MB_DB_USER=postgres
set MB_DB_PASS=oussama

set MB_PORT=3000

echo ==========================================================
echo  Starting Metabase...
echo  Database: metabase (PostgreSQL)
echo  Port:     %MB_PORT%
echo  Java:     %JAVA_HOME%
echo ==========================================================

"%JAVA_HOME%\bin\java" -jar "%~dp0metabase.jar"
