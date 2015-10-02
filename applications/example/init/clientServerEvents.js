if (application.isWorker) {

  application.frontend.on('test', function(data) {
    console.dir(data);
  });

  setInterval(function() {
    application.frontend.send('test', { field: 'value' });
  }, 10000);

}
