(client, callback) => {
  client.context.data = { someDataForWorker: 'parameterValue' };
  application.forkLongWorker(client, 'worker');
  callback();
}
