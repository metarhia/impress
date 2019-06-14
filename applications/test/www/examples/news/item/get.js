(client, callback) => {
  const item = api.news.getItem(client.query.id);
  if (!item) {
    client.error(404);
    callback(null);
  } else {
    callback(null, item);
  }
};
