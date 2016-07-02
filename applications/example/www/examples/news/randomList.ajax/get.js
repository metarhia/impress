module.exports = function(client, callback) {
  api.news.shuffle();
  callback({ list: api.news.data });
};
