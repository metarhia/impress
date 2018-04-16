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

api.con.createConsole = (applicationName) => {

  const log = (...args) => {
    const msg = api.util.format(...args);
    impress.log.info(applicationName + '\t' + msg);
  };

  const dir = (...args) => {
    const msg = api.util.inspect(...args);
    impress.log.debug(applicationName + '\t' + msg);
  };

  const debug = (...args) => {
    const msg = api.util.format(...args);
    impress.log.debug(applicationName + '\t' + msg);
  };

  const error = (...args) => {
    const msg = api.util.format(...args);
    impress.log.error(applicationName + '\t' + msg);
  };

  const trace = (...args) => {
    const msg = api.util.format(...args);
    const err = new Error(msg);
    const stack = impress.shortenStack(err.stack);
    impress.log.debug(applicationName + '\t' + stack);
  };

  const warn = (...args) => {
    const msg = api.util.format(...args);
    impress.log.warn(applicationName + '\t' + msg);
  };

  return { log, dir, debug, error, trace, warn, info: log };

};
