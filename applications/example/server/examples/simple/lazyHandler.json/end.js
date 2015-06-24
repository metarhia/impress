module.exports = function(client, callback) {
  console.log('Request finalization handler: end.js');
  callback({ handler: 'end' });
};
