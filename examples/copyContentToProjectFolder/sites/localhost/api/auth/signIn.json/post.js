module.exports = function(req, res, callback) {
	res.context.data = { Result: "Error" };
	impress.getUser(req.post.Login, function(err, user) {
		if (user && (user.password == req.post.Password)) {
			impress.startSession(req, res);
			res.context.data = { Result:"Ok" };

			if (!impress.users[user._id]) impress.users[user._id] = user;
			impress.sessions[req.impress.session].userId = user._id;
			req.impress.sessionModified = true;
		}
		if (req.post.loginForm) impress.redirect(res, "/");
		callback();
	});
}