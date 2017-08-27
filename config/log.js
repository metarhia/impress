{
  enabled: true,
  keepDays: 100,     // Delete files after N days
  writeInterval: '3s',    // Flush log to disk interval (milliseconds)
  writeBuffer: 64 * 1024, // Buffer size 64kb
  files: [
    'access', 'api', 'error', 'debug', 'slow',
    'server', 'node', 'cloud', 'warning'
  ],
  stdout: [
    'error', 'debug', 'warning'
  ]
}
