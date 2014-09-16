module.exports = function(client, callback) {

  callback({
    query:  client.query,
    path:   client.path,
    fields: client.fields
  });

}