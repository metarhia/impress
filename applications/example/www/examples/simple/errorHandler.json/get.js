(client, callback) => {
  console.log('Verb handler: get.js (with errer to generate exception)');
  callback(null, { handler: 'get' });
  // eslint-disable-next-line no-undef
  undefinedFunctionCall();
}
