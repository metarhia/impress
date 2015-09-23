module.exports = function(client, callback) {
  client.block();
  callback();
};
