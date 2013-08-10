module.exports = function(req, res, callback) {

/*
{ rename:
   { operation: 'rename_node',
     id: '/types/Раздел 1/Подраздел 1',
     title: 'Подраздел 1+' } }
*/

	jb.idRename(jb.oid(req.post.id), req.post.title, function(err, renamed) {
		res.context.data = { status: renamed ? 1 : 0 };
		callback();
	});

}