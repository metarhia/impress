(client, callback) => {
  const num = api.path.basename(client.path);
  const building = api.json.parse(client.fields.building),
  dbCity.buildings.update({ num }, building, (err) => {
    callback({ success: !err });
  });
}
