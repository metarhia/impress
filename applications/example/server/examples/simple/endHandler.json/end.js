module.exports = function(client, callback) {
  console.log('Request finalization handler: end.js, execures after request.js and [verb].js (get.js, post,js for example)');
  callback({ handler: 'end' });
};
