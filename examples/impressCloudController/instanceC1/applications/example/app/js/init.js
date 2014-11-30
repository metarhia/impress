$(function() {

  var log = $('#log');

  sseConnect();

  function sseConnect() {
    var sse = new EventSource("/events/connect.sse");

    sse.addEventListener("TestEvent", function(e) {
      log.prepend("Event: "+e.type+"; Data: "+e.data+"<br>");
    });

    sse.addEventListener("open", function(e) {
      log.prepend("Connection opened<br>");
    }, false);

    sse.addEventListener("error", function(e) {
      if (e.readyState === EventSource.CLOSED) log.prepend("Connection closed by server<br>");
      else log.prepend("SSE Error: readyState="+sse.readyState+"<br>");
    }, false);
  }

});
