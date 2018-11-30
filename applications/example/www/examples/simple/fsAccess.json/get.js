(client, callback) => {
  const filePath = '/www' + client.path + '/test.txt';
  api.fs.readFile(filePath, 'utf8', (error, data) => {
    callback(null, { fileContent: data, dataLength: data.length });
  });
}
