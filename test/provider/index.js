'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARK = 'provider-executed';
const CRASH_TX = 'crashonce!!!';

if (require.main !== module) {
  const mark = path.join(process.cwd(), MARK);
  fs.writeFileSync(mark, 'fixture-provider\n');
}

const recordPath = (index) => {
  const name = `provider-record-${index}.json`;
  return path.join(process.cwd(), name);
};

const writeRecord = (index, state) => {
  fs.writeFileSync(recordPath(index), JSON.stringify(state));
};

const isCrash = (chunk) => {
  if (chunk.length < 20) return false;
  return chunk.toString('latin1', 8, 20) === CRASH_TX;
};

const start = (options, context) => {
  const index = context.thread.index;
  const count = context.thread.count;
  const group = context.thread.group;
  const protocols = context.protocols.slice();
  const token = options.token ?? '';
  const state = {
    index,
    count,
    group,
    protocols,
    token,
    tcp: '',
    udp: '',
    stopped: false,
    started: Date.now(),
  };
  writeRecord(index, state);
  const connection = (socket) => {
    socket.on('error', () => undefined);
    socket.on('data', (chunk) => {
      if (isCrash(chunk)) process.exit(1);
      state.tcp = chunk.toString('hex');
      writeRecord(index, state);
    });
  };
  const datagram = (buffer) => {
    state.udp = buffer.toString('hex');
    writeRecord(index, state);
  };
  const stop = () => {
    state.stopped = true;
    writeRecord(index, state);
  };
  return { connection, datagram, stop };
};

module.exports = { start };
