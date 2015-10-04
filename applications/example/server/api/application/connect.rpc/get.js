module.exports = function(client, callback) {
  if (client.rpc) client.rpc.accept({
    ajax: true,
    interface1: {
      getApplicationName: function(callback) {
        callback(application.name);
      },
      sum: function(a, b, callback) {
        callback(a + b);
      }
    },
    interface2: {
      listTitles: function(callback) {
        callback(api.news.data.map(function(item) {
          return item.title;
        }));
      },
      getNext: function(callback) {
        api.news.current++;
        if (api.news.current >= api.news.data.length) api.news.current = 0;
        callback(api.news.data[api.news.current]);
      },
      shuffle: function(callback) {
        api.impress.shuffle(api.news.data);
        callback(true);
      },
      getItem: function(n, callback) {
        callback(api.news.data[n]);
      }
    }
  });
  callback();
};
