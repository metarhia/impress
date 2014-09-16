module.exports = function(client, callback) {

  callback({
    parameterName: client.query.parameterName,
  });

}