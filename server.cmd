SET IMPRESS_MODE=prod

node --stack-trace-limit=1000 --allow-natives-syntax server.js

@REM Add following parameter to extend process memory to 2 Gb
@REM --max_old_space_size=2048

@REM Add following parameter to disable automatic GC and call gs() manually
@REM --nouse-idle-notification --expose-gc

pause
