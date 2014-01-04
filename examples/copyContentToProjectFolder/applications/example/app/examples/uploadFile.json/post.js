module.exports = function(req, res, callback) {
	res.context.data = req.impress.files;
	callback();
}