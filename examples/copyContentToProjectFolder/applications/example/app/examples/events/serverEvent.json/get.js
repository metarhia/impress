module.exports = function(client, callback) {

  application.events.sendToServer('TestEvent', { test: "data" });
  callback("Ok");

}