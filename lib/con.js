'use strict';

// Console utilities for Impress Application Server

// Read
//   prompt <string>
//   callback <Function>(s <string>) where s is user input string
api.con.read = (prompt, callback) => {
  const rl = api.readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(prompt, s => {
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

api.con.createConsole = application => {

  let groupIndent = '';

  const assert = (assertion, ...args) => {
    try {
      console.assert(assertion, ...args);
    } catch (err) {
      const stack = impress.shortenStack(err.stack);
      application.log.error(`${groupIndent}${stack}`);
    }
  };

  const clear = () => {};

  const counts = new Map();

  const count = (label = 'default') => {
    label = label.toString();
    let cnt = counts.get(label) || 0;
    cnt++;
    counts.set(label, cnt);
    application.log.info(`${groupIndent}${label}: ${cnt}`);
  };

  const countReset = (label = 'default') => {
    counts.delete(label.toString());
  };

  const times = new Map();

  const time = (label = 'default') => {
    times.set(label.toString(), process.hrtime());
  };

  const timeEnd = (label = 'default') => {
    label = label.toString();
    const startTime = times.get(label);
    if (startTime === undefined) {
      application.log.warn(
        `${groupIndent}Warning: No such label '${label}' for console.timeEnd()`
      );
      return;
    }
    times.delete(label);
    const totalTime = process.hrtime(startTime);
    const totalTimeMs = totalTime[0] * 1e3 + totalTime[1] / 1e6;
    application.log.info(`${groupIndent}${label}: ${totalTimeMs}ms`);
  };

  const log = (...args) => {
    const msg = api.util.format(...args);
    application.log.info(`${groupIndent}${msg}`);
  };

  const dir = (...args) => {
    const msg = api.util.inspect(...args);
    application.log.debug(`${groupIndent}${msg}`);
  };

  const debug = (...args) => {
    const msg = api.util.format(...args);
    application.log.debug(`${groupIndent}${msg}`);
  };

  const error = (...args) => {
    const msg = api.util.format(...args);
    application.log.error(`${groupIndent}${msg}`);
  };

  const trace = (...args) => {
    const msg = api.util.format(...args);
    const err = new Error(msg);
    const stack = impress.shortenStack(err.stack).slice(5);
    application.log.debug(`${groupIndent}Trace${stack}`);
  };

  const warn = (...args) => {
    const msg = api.util.format(...args);
    application.log.warn(`${groupIndent}${msg}`);
  };

  const group = (...args) => {
    if (args.length !== 0) log(...args);
    groupIndent = ' '.repeat(groupIndent.length + 2);
  };

  const groupEnd = () => {
    if (groupIndent.length === 0) return;
    groupIndent = ' '.repeat(groupIndent.length - 2);
  };

  return {
    assert, clear, count, countReset, time, timeEnd,
    log, dir, debug, error, trace, warn, info: log,
    group, groupCollapsed: group, groupEnd
  };

};
