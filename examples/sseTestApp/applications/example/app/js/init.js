var api, output;

global.onLoad(function() {

  output = document.getElementById('output');

  api = wcl.AjaxDataSource({
    mathodOne: { post: '/api/methodOne.json' },
    mathodTwo: { get:  '/api/methodTwo.json' }
  });

  sseConnect();

  function sseConnect() {
    var sse = new EventSource('/api/connect.sse');

    sse.addEventListener('TestEvent', function(e) {
      log('Event: ' + e.type + '; Data: ' + e.data);
    });

    sse.addEventListener('open', function(e) {
      log('Connection opened');
    }, false);

    sse.addEventListener('error', function(e) {
      if (e.readyState === EventSource.CLOSED) log('Connection closed by server');
      else log('SSE Error: readyState = ' + sse.readyState);
    }, false);

    //sse.close();

    // panelCenter.append('Sending event to server, it should return back.<hr>');
    // $.get('/examples/events/sendEvent.json', function(res) {

  }

  function log(message) {
    var tag = document.createElement('div');
    tag.innerHTML = message;
    output.appendChild(tag);
    output.insertBefore(tag, output.firstChild);
  }

});
