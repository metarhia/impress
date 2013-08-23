module.exports = function(req, res, callback) {
	impress.security.getUser(req.post.Email, function(err, user) {
		res.context.data = { Email: !user };
		callback();
	});
}