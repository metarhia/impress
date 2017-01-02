(client, callback) => {
  const num = api.path.basename(client.path);
  dbCity.buildings.update(
    { num: num },
    api.json.parse(client.fields.building),
    (err) => callback({ success: !err })
  );
}
