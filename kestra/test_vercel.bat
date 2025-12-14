@echo off
REM Windows batch script to test Vercel API
REM Usage: test_vercel.bat YOUR_VERCEL_TOKEN

IF "%1"=="" (
    echo Usage: test_vercel.bat YOUR_VERCEL_TOKEN
    echo.
    echo Get your token from: https://vercel.com/account/tokens
    exit /b 1
)

SET VERCEL_TOKEN=%1

echo ============================================================
echo VERCEL API TEST
echo ============================================================
echo.

echo 1. Testing token validity...
curl -s -H "Authorization: Bearer %VERCEL_TOKEN%" https://api.vercel.com/v2/user | jq "{username, email}"
echo.

echo 2. Fetching all projects...
curl -s -H "Authorization: Bearer %VERCEL_TOKEN%" https://api.vercel.com/v9/projects?limit=100 | jq ".projects[] | {name, id, repo: .link.repo}"
echo.

echo 3. Enter project name to check:
SET /P PROJECT_NAME="Project name (e.g., app-abubbwyfyxf1ozkjgust2): "
echo.

echo 4. Getting project ID...
FOR /F "tokens=*" %%i IN ('curl -s -H "Authorization: Bearer %VERCEL_TOKEN%" https://api.vercel.com/v9/projects?limit=100 ^| jq -r ".projects[] | select(.name == \"%PROJECT_NAME%\") | .id"') DO SET PROJECT_ID=%%i

IF "%PROJECT_ID%"=="" (
    echo ERROR: Project not found!
    exit /b 1
)

echo Found project ID: %PROJECT_ID%
echo.

echo 5. Fetching deployments...
curl -s -H "Authorization: Bearer %VERCEL_TOKEN%" "https://api.vercel.com/v11/deployments?projectId=%PROJECT_ID%&limit=10" | jq ".deployments[] | {uid, url, state, commit: .meta.githubCommitSha}"
echo.

echo ============================================================
echo TEST COMPLETE!
echo ============================================================
