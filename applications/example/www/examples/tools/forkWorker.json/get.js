module.exports = function(client, callback) {
  client.context.data = { someDataForWorker: 'parameterValue' };
  client.fork('worker');
  callback();
};
