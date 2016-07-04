(client, callback) => {
  if (client.rpc) client.rpc.accept();
  callback();
}