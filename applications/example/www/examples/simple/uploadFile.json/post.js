(client, callback) => {

  callback(err, client.files);

  client.upload((err, file) => {
    console.dir({ uploadedFile: file });
  }, (err, count) => {
    console.log('All ' + count + ' file(s) are uploaded.');
  });

}
