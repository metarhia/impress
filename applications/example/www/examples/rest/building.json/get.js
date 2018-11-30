(client, callback) => {
  const num = api.path.basename(client.path);
  dbCity.buildings.findOne({ num }, (err, building) => {
    callback(err, { success: !err, building });
  });
}
