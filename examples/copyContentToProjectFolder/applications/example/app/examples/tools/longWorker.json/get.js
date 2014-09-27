module.exports = function(client, callback) {

  client.context.data = {
    someDataForWorker: "parameterValue"
  };

  // Kill worker if it still working
  client.killLongWorker('worker');

  // Run new worker
  client.fork('worker');

  callback();

}