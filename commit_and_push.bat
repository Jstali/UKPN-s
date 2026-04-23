@echo off
REM One-click: commit the two review docs and push to origin/master.
REM Run from the repo root by double-clicking, or: cd to repo and run "commit_and_push.bat".

cd /d "%~dp0"

echo.
echo === Clearing any stale git lock ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo.
echo === Staging review docs ===
git add CODE_REVIEW.md FIX_PROMPT.md
if errorlevel 1 goto :err

echo.
echo === Committing ===
git commit -m "docs: add code review report and remediation handoff prompt" -m "- CODE_REVIEW.md: severity-rated findings (S1-3, S2-9, S3-17, S4-10) covering security, correctness, performance, and code quality." -m "- FIX_PROMPT.md: self-contained handoff prompt with per-finding fix instructions, code snippets, and a 15-step verification checklist."
if errorlevel 1 goto :err

echo.
echo === Pushing to origin/master ===
git push origin master
if errorlevel 1 goto :err

echo.
echo === DONE ===
pause
exit /b 0

:err
echo.
echo *** A step failed. See the output above. ***
pause
exit /b 1
