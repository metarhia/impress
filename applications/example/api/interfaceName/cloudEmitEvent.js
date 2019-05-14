callback => {
  application.frontend.emit('workerHello', { answer: 42 });
  callback();
}
