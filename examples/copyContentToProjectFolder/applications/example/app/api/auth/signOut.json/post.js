module.exports = function(client, callback) {
	impress.security.signOut(client, callback);
	callback({ Result: "Ok" })
}