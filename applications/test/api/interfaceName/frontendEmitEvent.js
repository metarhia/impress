callback => {
  application.frontend.emit('frontendWorkerHello', { answer: 42 });
  callback();
}
