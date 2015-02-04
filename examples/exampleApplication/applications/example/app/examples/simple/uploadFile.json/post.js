module.exports = function(client, callback) {

  callback(client.files);

  client.upload(function(file) {
    console.dir({ uploadedFile: file });
  }, function(doneCount) {
    console.log('All ' + doneCount + ' file(s) are uploaded.');
  });

};
