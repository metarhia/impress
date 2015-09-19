module.exports = function(client, callback) {
  client.startSession();
  callback({ sid: client.sid });
};
