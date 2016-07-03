(client, callback) => {
  var attachmentName = 'example.png',
      filePath = application.dir + '/www' + client.path + '/' + attachmentName;
  client.download(filePath, attachmentName, callback);
}