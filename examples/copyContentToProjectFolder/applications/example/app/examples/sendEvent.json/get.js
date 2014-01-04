module.exports = function(client, callback) {

	impress.sse.sendGlobal('TestEvent', { test: "data" });
	callback();

}