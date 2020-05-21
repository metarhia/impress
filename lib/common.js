'use strict';

const parseHost = host => {
  const portOffset = host.indexOf(':');
  if (portOffset > -1) return host.substr(0, portOffset);
  return host;
};

const timeout = msec => new Promise(resolve => {
  setTimeout(resolve, msec);
});

const sample = arr => arr[Math.floor(Math.random() * arr.length)];

module.exports = { parseHost, timeout, sample };
