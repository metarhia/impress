module.exports = function(client, callback) {

  client.cache("30s");
  callback();

}