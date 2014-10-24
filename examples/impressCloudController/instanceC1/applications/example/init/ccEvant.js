if (api.cluster.isWorker) {
  setInterval(function() {
    console.log('SEND');
    application.events.sendGlobal('TestEvent', { test: "data" });
  }, 5000);
}
