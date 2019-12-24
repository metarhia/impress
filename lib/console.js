'use strict';

class Console {
  constructor(logger) {
    this.logger = logger;
    this.groupIndent = '';
    this.counts = new Map();
    this.times = new Map();
  }

  assert(assertion, ...args) {
    try {
      console.assert(assertion, ...args);
    } catch (err) {
      const stack = impress.shortenStack(err.stack);
      this.logger.error(`${this.groupIndent}${stack}`);
    }
  }

  clear() {
    api.readline.cursorTo(process.stdout, 0, 0);
    api.readline.clearScreenDown(process.stdout);
  }

  count(label = 'default') {
    let cnt = this.counts.get(label) || 0;
    cnt++;
    this.counts.set(label, cnt);
    this.logger.info(`${this.groupIndent}${label}: ${cnt}`);
  }

  countReset(label = 'default') {
    this.counts.delete(label);
  }

  time(label = 'default') {
    this.times.set(label, process.hrtime());
  }

  timeEnd(label = 'default') {
    const startTime = this.times.get(label);
    if (startTime === undefined) {
      this.logger.warn(`${this.groupIndent}Warning: No such label '${label}'`);
      return;
    }
    this.times.delete(label);
    const totalTime = process.hrtime(startTime);
    const totalTimeMs = totalTime[0] * 1e3 + totalTime[1] / 1e6;
    this.logger.info(`${this.groupIndent}${label}: ${totalTimeMs}ms`);
  }

  log(...args) {
    const msg = api.util.format(...args);
    this.logger.info(`${this.groupIndent}${msg}`);
  }

  dir(...args) {
    const msg = api.util.inspect(...args);
    this.logger.debug(`${this.groupIndent}${msg}`);
  }

  debug(...args) {
    const msg = api.util.format(...args);
    this.logger.debug(`${this.groupIndent}${msg}`);
  }

  error(...args) {
    const msg = api.util.format(...args);
    this.logger.error(`${this.groupIndent}${msg}`);
  }

  trace(...args) {
    const msg = api.util.format(...args);
    const err = new Error(msg);
    const stack = impress.shortenStack(err.stack).slice(5);
    this.logger.debug(`${this.groupIndent}Trace${stack}`);
  }

  warn(...args) {
    const msg = api.util.format(...args);
    this.logger.warn(`${this.groupIndent}${msg}`);
  }

  group(...args) {
    if (args.length !== 0) this.log(...args);
    this.groupIndent = ' '.repeat(this.groupIndent.length + 2);
  }

  groupEnd() {
    if (this.groupIndent.length === 0) return;
    this.groupIndent = ' '.repeat(this.groupIndent.length - 2);
  }

  // Read
  //   prompt <string>
  //   callback <Function>(s <string>) where s is user input string
  read(prompt, callback) {
    const rl = api.readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(prompt, line => {
      rl.close();
      callback(null, line);
    });
  }
}

module.exports = Console;
