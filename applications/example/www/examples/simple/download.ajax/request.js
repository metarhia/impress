(client, callback) => {
  const attachmentName = 'example.png';
  const filePath = (
    application.dir + '/www' +
    client.path + '/' + attachmentName
  );
  client.download(filePath, attachmentName, callback);
}
