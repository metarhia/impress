module.exports = function(req, res, callback) {

	impress.sse.sendGlobal('TestEvent', { test: "data" });
	callback();

}