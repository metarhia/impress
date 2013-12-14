module.exports = function(req, res, callback) {
	impress.security.register(req, res, function(err, user) {
		console.dir({user:user});
		if (user) res.context.data = { Result: "Ok" };
		else res.context.data = { Result: "Error" };
		callback();
	});
}