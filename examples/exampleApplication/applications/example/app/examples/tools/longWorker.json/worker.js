module.exports = function(client, callback) {

  console.log('Message from forked worker, will terminate in 30 seconds');

  var counter = 0;

  setInterval(function() {
    counter++;
    console.log('Next 3 seconds counter: '+counter);
  }, 3000);

  setTimeout(function() {
    console.log('Forked worker terminated after 30 seconds');
    callback();
  }, 30000);
  
}