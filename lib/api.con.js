'use strict';

// Console utilities for Impress Application Server

// Read user input
//   prompt - prompt string
//   callback(s) - function with single parameter - user input string
//
api.con.read = (prompt, callback) => {
  let rl = api.readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(prompt, (s) => {
    rl.close();
    callback(s);
  });
};

// Clear screen
//
api.con.clear = () => {
  let rl = api.readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  api.readline.cursorTo(process.stdout, 0, 0);
  api.readline.clearScreenDown(process.stdout);
  rl.close();
};
