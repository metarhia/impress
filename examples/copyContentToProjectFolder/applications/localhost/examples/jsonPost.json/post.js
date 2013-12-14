module.exports = function(req, res, callback) {

	impress.requestCounter = impress.requestCounter || 0;

	res.context.data = {
		status: 1,
		parameterValue: req.post.parameterName,
		valueLength: req.post.parameterName.length,
		requestCounter: impress.requestCounter++
	};
	callback();

}