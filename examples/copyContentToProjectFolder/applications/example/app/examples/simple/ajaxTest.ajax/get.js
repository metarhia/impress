module.exports = function(client, callback) {
	client.context.data = {
		parameterName: client.query.parameterName,
	};
	callback();
}