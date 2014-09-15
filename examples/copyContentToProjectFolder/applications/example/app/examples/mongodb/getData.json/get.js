module.exports = function(client, callback) {

  dbAlias.testCollection.find({}).toArray(function(err, nodes) {
    callback(nodes);
  });

}