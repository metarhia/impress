if (api.cluster.isWorker) {
  setInterval(function() {
    application.events.sendGlobal('TestEvent', { time: new Date() });
  }, 5000);
}
