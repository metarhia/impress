module.exports = function(client, callback) {
  client.context.data = { someDataForWorker: 'parameterValue' };
  client.killLongWorker('worker');
  client.fork('worker');
  callback();
};
