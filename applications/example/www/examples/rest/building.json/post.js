(client, callback) => {
  var num = api.path.basename(client.path);
  dbCity.buildings.update(
    { num: num },
    api.json.parse(client.fields.building),
    function(err) {
      callback({ success: !err });
    }
  );
}