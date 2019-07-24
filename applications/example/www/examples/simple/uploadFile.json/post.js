(client, callback) => {

  client.upload((err, file) => {
    console.debug({ uploadedFile: file });
  }, (err, count) => {
    console.debug(`All ${count} file(s) are uploaded.`);
    callback(err, { count, files: client.files });
  });

}
