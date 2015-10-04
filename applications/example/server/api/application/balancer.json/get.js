module.exports = function(client, callback) {
  callback({
    servers: {
      S0: {
        ports: [80, 81, 82, 83]
      }
    }
  });
};
