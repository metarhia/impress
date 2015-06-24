module.exports = function(client, callback) {
  console.log('Request handler: request.js');
  callback({ handler: 'request' });
};
