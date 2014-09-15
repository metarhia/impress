module.exports = function(client, callback) {

  var filePath = application.appDir+client.path+'/test.txt';
  api.fs.readFile(filePath, 'utf8', function(error, data) {
    callback({ fileContent: data, dataLength: data.length });
  });

}