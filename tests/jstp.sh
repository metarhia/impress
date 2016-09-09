DIR="$( cd "$( dirname "${BASH_SOURCE[0]}"  )" && pwd  )"
node --stack-trace-limit=1000 --allow-natives-syntax $DIR/jstp.js $@
