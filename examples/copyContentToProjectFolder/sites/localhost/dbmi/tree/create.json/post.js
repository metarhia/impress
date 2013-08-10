module.exports = function(req, res, callback) {
/*
	req.post.operation:create_node
	req.post.id:/objects
	req.post.position:0
	req.post.title:Level 1 раздел
	req.post.type:default
*/

	jb.idInsert(jb.oid(req.post.id), { _name: req.post.title, type: req.post.type, _created: new Date() }, function(err, nodes) {
		var node = nodes[0], status = 0, id = 0;
		if (node) {
			id = node._id;
			status = 1;
		}
		res.context.data = { status: status, id: id, rel: req.post.type };
		callback();
	});

}