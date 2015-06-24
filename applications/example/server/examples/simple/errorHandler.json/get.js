module.exports = function(client, callback) {
  console.log('Verb handler: get.js (with errer to generate exception)');
  callback({ handler: 'get' });
  undefinedFunctionCall();
};
