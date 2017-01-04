'use strict';

// Console utilities for Impress Application Server

api.con.read = (
  prompt, // prompt string
  callback // function(s), where s is user input string
) => {
  const rl = api.readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(prompt, (s) => {
    rl.close();
    callback(s);
  });
};

api.con.clear = () => {
  const rl = api.readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  api.readline.cursorTo(process.stdout, 0, 0);
  api.readline.clearScreenDown(process.stdout);
  rl.close();
};
