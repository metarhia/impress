(client, callback) => {
  if (client.req.user) {
    callback(null, client.req.user);
  } else {
    callback(null, { error: 'User not logged' });
  }
};
