module.exports = function(client, callback) {

  callback(client.files);

  client.upload(function(file) {
    console.log('Uploaded');
    console.dir({file:file});
  }, function() {
    console.log('All files uploaded.');
  });

};
