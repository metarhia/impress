module.exports = function(req, res, callback) {
	impress.destroySession(req, res);
	res.context.data = "Ok";
	callback();
}