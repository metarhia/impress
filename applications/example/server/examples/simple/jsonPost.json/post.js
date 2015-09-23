var meta = {
  description: 'Test method description',
  parameters: {
    parameterName: 'string // Parameter #1',
    par2: '5:string // Parameter #2',
  },
  result: 'Returns JSON { a: 1 }'
};

module.exports = function(client, callback) {
  application.requestCounter = application.requestCounter || 0;
  if (client.fields.parameterName) {
    callback({
      status: 1,
      parameterValue: client.fields.parameterName,
      valueLength: client.fields.parameterName.length,
      requestCounter: application.requestCounter++
    });
  } else callback({ error: 'POST parameter "parameterName" required' });
};

module.exports.meta = meta;
