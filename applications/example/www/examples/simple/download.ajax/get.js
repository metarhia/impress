(client, callback) => {
  const attachmentName = 'example.png';
  const filePath = api.path.join(
    application.dir, 'www', client.path, attachmentName
  );
  client.download(filePath, attachmentName, callback);
}
