(client, callback) => {

  callback(client.files);

  client.upload((file) => {
    console.dir({ uploadedFile: file });
  }, (doneCount) => {
    console.log('All ' + doneCount + ' file(s) are uploaded.');
  });

}
