module.exports = function(req, res, callback) {
	res.context.data = { Result: "Error" };
	impress.getUser(req.post.Login, function(err, node) {
		if (node && (node.password == req.post.Password)) {
			impress.startSession(req, res);
			res.context.data = {Result:"Ok"};
			impress.sessions[req.impress.session].userId = node._id;
			impress.sessions[req.impress.session].login = node.login;
			req.impress.sessionModified = true;
		}
		if (req.post.loginForm) impress.redirect(res, "/");
		callback();
	});
}