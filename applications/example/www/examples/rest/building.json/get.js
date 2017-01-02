(client, callback) => {
  const num = api.path.basename(client.path);
  dbCity.buildings.findOne({ num: num }, (err, building) => {
    callback({ success: !err, building: building });
  });
}
