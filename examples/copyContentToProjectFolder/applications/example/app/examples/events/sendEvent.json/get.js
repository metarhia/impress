module.exports = function(client, callback) {

  application.events.sendGlobal('TestEvent', { test: "data" });
  callback("Ok");

}