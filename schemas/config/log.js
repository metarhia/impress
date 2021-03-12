({
  keepDays: { type: 'number', default: 100 },
  writeInterval: { type: 'number', default: 3000 },
  writeBuffer: { type: 'number', default: 64 * 1024 },
  toFile: { array: 'string' },
  toStdout: { array: 'string' },
});
