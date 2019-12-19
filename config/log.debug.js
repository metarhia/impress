({
  enabled: true,
  keepDays: 100, // Delete files after N days
  writeInterval: Duration('3s'), // Flush log to disk interval
  writeBuffer: 64 * 1024, // Buffer size 64kb
  toStdout: ['system', 'fatal', 'error', 'warn', 'debug']
});
