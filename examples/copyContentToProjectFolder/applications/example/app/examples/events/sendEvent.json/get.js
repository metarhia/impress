module.exports = function(client, callback) {

	impress.sse.sendGlobal(client, 'TestEvent', { test: "data" });
	callback("Ok");

}