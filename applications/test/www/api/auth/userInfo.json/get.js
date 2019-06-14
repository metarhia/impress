(client, callback) => {
  if (client.session) {
    callback(null, client.session);
  } else {
    callback(null, { error: 'User not logged' });
  }
};
