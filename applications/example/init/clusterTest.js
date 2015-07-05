/*
if (api.cluster.isWorker) {
  //setInterval(function() {
    //application.events.sendGlobal('TestEvent', { test: 'data' });
  //}, 5000);

  var startTime = new Date().getTime();
  var count = 0;

  function test() {
    count++;
    impress.cloud.client.call('example', 'method1', {}, function(res) {
      test();
    });
  }

  setTimeout(test, 1000);
  setTimeout(test, 1200);
  setTimeout(test, 1400);

  setInterval(function() {
    var endTime = new Date().getTime(),
        processingTime = endTime - startTime;
    console.log(impress.nodeId + ' Processing time: ' + processingTime + ' count: ' + count);
  }, 5000);

}
*/