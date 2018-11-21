(client, callback) => {
  client.context.data = { someDataForWorker: 'parameterValue' };
  application.killLongWorker(client, 'worker');
  application.forkLongWorker(client, 'worker');
  callback();
}
