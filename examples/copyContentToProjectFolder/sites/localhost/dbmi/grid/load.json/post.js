module.exports = function(req, res, callback) {
	res.context.data = { status:0 };

	jb.idGet(jb.oid(req.post.id), function(err, node) {
		res.context.data = {
			status: 1,
			node: node,
			children: []
		};
		jb.idList(jb.oid(req.post.id), function(err, nodes) {
			for (var i=0; i<nodes.length; ++i) {
				var node = nodes[i];
				res.context.data.children.push(node._name);
			}
			callback();
		});
	});

}