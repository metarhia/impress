module.exports = function(client, callback) {
  var attachmentName = 'example.png',
      filePath = application.appDir + client.path + '/' + attachmentName;
  client.download(filePath, attachmentName, callback);
}
