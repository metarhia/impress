module.exports = function(client, callback) {
	client.startSession();
	client.context.data = { SID: client.session };
	callback();
}