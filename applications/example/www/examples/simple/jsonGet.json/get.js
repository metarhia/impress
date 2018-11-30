(client, callback) => {
  callback(null, {
    query: client.query,
    path: client.path,
    fields: client.fields,
    parameters: client.parameters
  });
}
