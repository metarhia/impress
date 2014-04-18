module.exports = function(client, callback) {

    application.requestCounter = application.requestCounter || 0;

	client.context.data = {
		status: 1,
		parameterValue: client.fields.parameterName,
		valueLength: client.fields.parameterName.length,
		requestCounter: application.requestCounter++
	};
	callback();

}