module.exports = function(req, res, callback) {
	res.context.data = { Result: "Ok" };
	impress.security.signOut(req, res, callback);
}