module.exports = function(req, res, callback) {
	res.context.data = { status:0 };

	var node = JSON.parse(req.post.node);

	if (req.impress.session) node.Author = impress.sessions[req.impress.session].login;
	node._modified = new Date();

	node._parent = jb.oid(node._parent);

	jb.idSave(jb.oid(req.post.id), node, function(err, count) {
		res.context.data = {
			status: (count>0) ? 1 : 0
		};
		callback();
	});

}