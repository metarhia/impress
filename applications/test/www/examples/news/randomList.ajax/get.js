(client, callback) => {
  api.news.shuffle();
  callback(null, { list: api.news.data });
};
