SET IMPRESS_MODE=test
cd ..
node --stack-trace-limit=1000 --allow-natives-syntax ./tests/integration.js
pause
