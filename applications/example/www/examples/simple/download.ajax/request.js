(client, callback) => {
  let attachmentName = 'example.png',
      filePath = application.dir + '/www' + client.path + '/' + attachmentName;
  client.download(filePath, attachmentName, callback);
}
