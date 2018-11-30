(client, callback) => {
  const item = api.news.getItem(client.query.id);
  // TODO: return HTTP 404
  if (!item) callback(null, { error: 'id not specified' });
  else callback(null, item);
}
