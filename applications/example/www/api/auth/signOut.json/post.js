(client, callback) => {
  client.context.data = { result: 'ok' };
  client.signOut(callback);
}
