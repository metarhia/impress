(client, callback) => {
  callback(client.req.user || { error: 'User not logged' });
}
