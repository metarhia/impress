module.exports = function(client, callback) {
  var num = api.path.basename(client.path);
  dbCity.buildings.findOne({ num: num }, function(err, building) {
    callback({ success: !err, building: building });
  });
}