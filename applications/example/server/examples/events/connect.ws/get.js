module.exports = function(client, callback) {
  var connection = client.websocket.accept();
  if (connection) {
    connection.send('Hello world');
    connection.on('message', function(/*message*/) {
      connection.send('I am here');
    });
    //connection.on('close', function(reasonCode, description) {
    //  console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    //});
  }
  callback();
};
