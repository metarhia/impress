module.exports = function(client, callback) {
  callback(api.news.getNext());
};
