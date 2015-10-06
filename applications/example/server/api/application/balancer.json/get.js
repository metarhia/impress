module.exports = function(client, callback) {
  callback({
    servers: {
      S0: {
        ssl: false,
        host: '127.0.0.1',
        ports: [80, 81, 82, 83]
      }
    }
  });
};
