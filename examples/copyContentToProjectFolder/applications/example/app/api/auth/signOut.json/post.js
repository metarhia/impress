module.exports = function(client, callback) {
	security.signOut(client, callback);
	callback({ Result: "Ok" })
}