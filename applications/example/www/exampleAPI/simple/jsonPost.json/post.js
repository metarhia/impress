(client, callback) => {
  application.requestCounter = application.requestCounter || 0;
  if (client.fields.parameterName) {
    callback(null, {
      status: 1,
      parameterValue: client.fields.parameterName,
      valueLength: client.fields.parameterName.length,
      requestCounter: application.requestCounter++
    });
  } else {
    callback(null, { error: 'POST parameter "parameterName" required' });
  }
}
