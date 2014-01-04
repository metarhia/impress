module.exports = function(client, callback) {
	client.context.data = { Result: "Ok" };
	impress.security.signOut(client, callback);
}