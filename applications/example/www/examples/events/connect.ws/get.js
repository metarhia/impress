(client, callback) => {
  const connection = client.websocket.accept();
  if (connection) {
    connection.send('Hello world');
    connection.on('message', message => {
      console.log('Web sockets: ' + message);
      connection.send('I am here');
    });
    connection.on('close', (reasonCode, description) => {
      console.debug('Peer disconnected'  + connection.remoteAddress);
    });
  }
  callback();
}
