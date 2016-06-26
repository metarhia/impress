'use strict';

// Console utilities for Impress Application Server

// Read user input
//   prompt - prompt string
//   callback(s) - function with single parameter - user input string
//
api.con.read = function(prompt, callback) {
  var rl = api.readline.createInterface({
    input: api.process.stdin,
    output: api.process.stdout
  });
  rl.question(prompt, function(s) {
    rl.close();
    callback(s);
  });
};

// Clear screen
//
api.con.clear = function() {
  var rl = api.readline.createInterface({
    input: api.process.stdin,
    output: api.process.stdout
  });
  api.readline.cursorTo(api.process.stdout, 0, 0);
  api.readline.clearScreenDown(api.process.stdout);
  rl.close();
};
