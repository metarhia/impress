module.exports = function(req, res, callback) {

	jb.idDelete(jb.oid(req.post.id), function(err, deleted) {
		res.context.data = { status: deleted ? 1 : 0 };
		callback();
	});

}