module.exports = function(client, callback) {

	sse.sendGlobal(client, 'TestEvent', { test: "data" });
	callback("Ok");

}