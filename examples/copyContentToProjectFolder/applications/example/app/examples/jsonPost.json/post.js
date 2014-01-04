module.exports = function(client, callback) {

    application.requestCounter = application.requestCounter || 0;

	client.context.data = {
		status: 1,
		parameterValue: client.req.fields.parameterName,
		valueLength: client.req.fields.parameterName.length,
		requestCounter: impress.requestCounter++
	};
	callback();

}