module.exports = function(req, res, callback) {
/*
	operation:move_node
	id:/objects/Раздел 3/Подраздел 2
	ref:/objects/Раздел 2/Подраздел 1
	position:0
	copy:0
*/

	jb.idMove(jb.oid(req.post.id), jb.oid(req.post.ref), +req.post.position, function(err, count) {
		res.context.data = { status: (count>0) ? 1 : 0 };
		callback();
	});

}