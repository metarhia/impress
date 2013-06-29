module.exports = function(req, res, callback) {
	impress.signIn(req, res, function(isSuccess) {
		if (isSuccess) res.context.data = { Result: "Ok" };
		else res.context.data = { Result: "Error" };
		if (req.post.loginForm) impress.redirect(res, "/");
		callback();
	});
}