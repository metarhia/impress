module.exports = function(client, callback) {
  console.log('Message from forked worker');
  console.dir(Object.keys(client));
  callback();
};
