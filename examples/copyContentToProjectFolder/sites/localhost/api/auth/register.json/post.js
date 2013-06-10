module.exports = function(req, res, callback) {
	res.context.data = { Result: "Error" };
	impress.startSession(req, res);
	impress.register(req.post.Email, req.post.Password, function(err, nodes) {
		if (nodes) {
			impress.startSession(req, res);
			impress.sessions[req.impress.session].userId = nodes[0]._id;
			impress.sessions[req.impress.session].login = nodes[0].login;
			res.context.data = { Result: "Ok" };
		}
		callback();
	});
}