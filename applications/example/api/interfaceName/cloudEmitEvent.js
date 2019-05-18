callback => {
  application.cloud.emit('cloudWorkerHello', { answer: 42 });
  callback();
}
