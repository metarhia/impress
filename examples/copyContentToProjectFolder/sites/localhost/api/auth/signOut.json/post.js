module.exports = function(req, res, callback) {
	res.context.data = { Result: "Ok" };
	impress.signOut(req, res, callback);
}