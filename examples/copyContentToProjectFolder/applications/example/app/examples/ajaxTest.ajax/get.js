module.exports = function(client, callback) {
	client.context.data = {
		parameterName: client.req.query.parameterName,
	};
	callback();
}