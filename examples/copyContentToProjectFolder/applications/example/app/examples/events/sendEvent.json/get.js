module.exports = function(client, callback) {

	application.sse.sendGlobal(client, 'TestEvent', { test: "data" });
	callback("Ok");

}