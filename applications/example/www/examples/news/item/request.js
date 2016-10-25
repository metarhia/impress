module.exports = function(client, callback) {
  var item = api.news.getItem(client.query.id);
  if (!item) callback({ error: 'id not specified' }, 404);
  else callback(item);
};
