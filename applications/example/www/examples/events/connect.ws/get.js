(client, callback) => {
  let connection = client.websocket.accept();
  if (connection) {
    connection.send('Hello world');
    connection.on('message', (/*message*/) => {
      connection.send('I am here');
    });
    //connection.on('close', (reasonCode, description) => {
    //  console.log((
    //    new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.'
    //  );
    //});
  }
  callback();
}
