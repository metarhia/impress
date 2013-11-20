module.exports = function(req, res, callback) {
	impress.startSession(req, res);
	res.context.data = { SID: req.impress.session };
	callback();
}