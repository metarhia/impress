module.exports = function(req, res, callback) {
	res.context.data = { Result: "Error" };
	impress.register(req.post.Email, req.post.Password, function(err, user) {
		if (user) {
			impress.startSession(req, res);
			impress.users[user._id] = user;
			impress.sessions[req.impress.session].userId = user._id;
			res.context.data = { Result: "Ok" };
		}
		callback();
	});
}