module.exports = function(req, res, callback) {
	impress.register(req, res, function(err, user) {
		if (user) res.context.data = { Result: "Ok" };
		else res.context.data = { Result: "Error" };
		callback();
	});
}