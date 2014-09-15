module.exports = function(client, callback) {

  application.requestCounter = application.requestCounter || 0;

  if (client.fields.parameterName) {
    callback({
      status: 1,
      parameterValue: client.fields.parameterName,
      valueLength:    client.fields.parameterName.length,
      requestCounter: application.requestCounter++
    });
  } else callback({ error: "POST parameter 'parameterName' required" });

}