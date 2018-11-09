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

api.con.createConsole = applicationName => {

  let groupIndent = '';

  const assert = (assertion, ...args) => {
    try {
      console.assert(assertion, ...args);
    } catch (err) {
      const stack = impress.shortenStack(err.stack);
      impress.log.error(`${applicationName}\t${groupIndent}${stack}`);
    }
  };

  const clear = () => {};

  const counts = new Map();

  const count = (label = 'default') => {
    label = label.toString();
    let c = counts.get(label) || 0;
    c++;
    counts.set(label, c);
    impress.log.info(`${applicationName}\t${groupIndent}${label}: ${c}`);
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
      impress.log.warn(
        `${applicationName}\t${groupIndent}` +
        `Warning: No such label '${label}' for console.timeEnd()`
      );
      return;
    }
    times.delete(label);
    const totalTime = process.hrtime(startTime);
    const totalTimeMs = totalTime[0] * 1e3 + totalTime[1] / 1e6;
    impress.log.info(
      `${applicationName}\t${groupIndent}${label}: ${totalTimeMs}ms`
    );
  };

  const log = (...args) => {
    const msg = api.util.format(...args);
    impress.log.info(`${applicationName}\t${groupIndent}${msg}`);
  };

  const dir = (...args) => {
    const msg = api.util.inspect(...args);
    impress.log.debug(`${applicationName}\t${groupIndent}${msg}`);
  };

  const debug = (...args) => {
    const msg = api.util.format(...args);
    impress.log.debug(`${applicationName}\t${groupIndent}${msg}`);
  };

  const error = (...args) => {
    const msg = api.util.format(...args);
    impress.log.error(`${applicationName}\t${groupIndent}${msg}`);
  };

  const trace = (...args) => {
    const msg = api.util.format(...args);
    const err = new Error(msg);
    const stack = impress.shortenStack(err.stack).slice(5);
    impress.log.debug(`${applicationName}\t${groupIndent}Trace${stack}`);
  };

  const warn = (...args) => {
    const msg = api.util.format(...args);
    impress.log.warn(`${applicationName}\t${groupIndent}${msg}`);
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
