(client, callback) => {
  const filePath = api.path.join('/www', client.path, 'test.txt');
  api.fs.readFile(filePath, 'utf8', (error, data) => {
    callback(null, { fileContent: data, dataLength: data.length });
  });
};
