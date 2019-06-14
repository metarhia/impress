(client, callback) => {
  client.context.data = { someDataForWorker: 'parameterValue' };
  application.startWorker(client, 'worker');
  callback();
};
