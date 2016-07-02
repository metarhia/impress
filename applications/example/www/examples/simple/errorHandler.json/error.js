module.exports = function(client, callback) {
  console.log('Cached Error');
  console.dir(client.err);
  callback();
};
