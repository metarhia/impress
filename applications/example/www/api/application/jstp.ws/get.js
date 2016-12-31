(client, callback) => {
  let connection = client.websocket.accept();
  if (connection) {
    api.jstp.serveOverWebsocket(connection);
  }
  callback();
}
