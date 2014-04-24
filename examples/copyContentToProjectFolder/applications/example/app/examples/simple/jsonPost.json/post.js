module.exports = function(client, callback) {

    application.requestCounter = application.requestCounter || 0;

	callback({
		status: 1,
		parameterValue: client.fields.parameterName,
		valueLength:    client.fields.parameterName.length,
		requestCounter: application.requestCounter++
	});

}