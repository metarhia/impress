// Server ports bind configuration
// Each server is named server on specified address and port

module.exports = {
  test: {
    protocol:      'http',
    address:       '127.0.0.1',
    port:          8080,
    nagle:         true,
    slowTime:      '1s',
    timeout:       '10s'
  },
};
