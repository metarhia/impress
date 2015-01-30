module.exports = function(client, callback) {

  callback(client.files);

  client.upload(function(file) {
    console.log('Uploaded: ' + file);
  }, function(file) {
    console.log('All files uploaded.');
  });

};
