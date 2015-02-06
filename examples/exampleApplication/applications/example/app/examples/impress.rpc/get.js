module.exports = function(client, callback) {

  client.rpc.accept();
  callback();

};
