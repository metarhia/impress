{
  enabled: false,
  keepDays: 100, // Delete files after N days
  writeInterval: '3s', // Flush log to disk interval (milliseconds)
  writeBuffer: 64 * 1024, // Buffer size 64kb

  // Log types:
  files: [
    'access', 'api', 'error', 'debug', 'slow',
    'server', 'node', 'cloud', 'warning'
  ],

  // Output log files to stdout:
  stdout: ['error', 'debug', 'warning']
}
