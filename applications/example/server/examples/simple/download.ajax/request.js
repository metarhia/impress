module.exports = function(client, callback) {
  var attachmentName = 'example.png',
      filePath = application.dir + '/server' + client.path + '/' + attachmentName;
  client.download(filePath, attachmentName, callback);
};
