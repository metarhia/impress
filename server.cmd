SET IMPRESS_MODE=prod

node --stack-trace-limit=1000 --allow-natives-syntax --max_old_space_size=2048 server.js

@REM Uncomment this to disable automatic GC and call gs() manually
@REM node --nouse-idle-notification --expose-gc server.js

pause
