module.exports = function(client, callback) {
  var num = api.path.basename(client.path);
  dbCity.buildings.update(
    { num: num },
    JSON.parse(client.fields.building),
    function(err) {
      callback({ success: !err });
    }
  );
}