module.exports = function(client, callback) {

	client.context.data = client.files;
	callback();

}