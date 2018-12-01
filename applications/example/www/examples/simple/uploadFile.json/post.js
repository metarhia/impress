(client, callback) => {

  callback(err, client.files);

  client.upload((err, file) => {
    console.debug({ uploadedFile: file });
  }, (err, count) => {
    console.debug('All ' + count + ' file(s) are uploaded.');
  });

}
