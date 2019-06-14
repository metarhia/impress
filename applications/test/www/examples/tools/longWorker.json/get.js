(client, callback) => {
  client.context.data = { someDataForWorker: 'parameterValue' };
  application.stopWorker(client, 'worker');
  application.startWorker(client, 'worker');
  callback();
};
