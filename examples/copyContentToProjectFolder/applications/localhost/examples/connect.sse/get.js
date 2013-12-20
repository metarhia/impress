module.exports = function(req, res, callback) {
	res.sse.channel = 'TestEvent';
	callback();
}