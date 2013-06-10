module.exports = function(req, res, callback) {
	impress.getUser(req.post.Email, function(err, node) {
		res.context.data = { Email: !node };
		callback();
	});
}