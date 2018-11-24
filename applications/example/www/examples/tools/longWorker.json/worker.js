(client, callback) => {

  let counter = 0;
  console.log('Message from forked worker, will terminate in 30 seconds');

  setInterval(() => {
    counter++;
    console.log('Next 3 seconds counter: ' + counter);
  }, 3000);

  setTimeout(() => {
    console.log('Forked worker terminated after 30 seconds');
    callback();
  }, 30000);

}
