(client, callback) => {
  let num = api.path.basename(client.path);
  dbCity.buildings.findOne({ num: num }, (err, building) => {
    callback({ success: !err, building: building });
  });
}
