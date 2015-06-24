module.exports = function(client, callback) {
  console.log('Lazy handler: lazy.js, executes after all other handlers and request connection closed');
  callback({ handler: 'lazy' });
};
