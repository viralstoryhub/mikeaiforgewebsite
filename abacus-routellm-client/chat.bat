@echo off
setlocal enabledelayedexpansion
REM Helper script to chat with Abacus.AI RouteLLM
REM Usage: chat.bat "Your message here"
REM Or for specific model: chat.bat "Your message" "gpt-5"

set ABACUS_API_KEY=s2_a6941c55824141caab8bc6820a9bc0d7

if "%~2"=="" (
    node bin/chat.js --model "gpt-5" --user %1
) else (
    node bin/chat.js --model %2 --user %1
)
