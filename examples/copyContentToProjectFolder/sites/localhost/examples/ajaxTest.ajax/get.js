module.exports = function(req, res, callback) {
	res.context.data = {
		parameterName: req.query.parameterName,
	};
	callback();
}