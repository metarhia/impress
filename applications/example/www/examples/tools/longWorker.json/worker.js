(client, callback) => {

  var counter = 0;
  console.log('Message from forked worker, will terminate in 30 seconds');

  api.timers.setInterval(function() {
    counter++;
    console.log('Next 3 seconds counter: ' + counter);
  }, 3000);

  api.timers.setTimeout(function() {
    console.log('Forked worker terminated after 30 seconds');
    callback();
  }, 30000);

}