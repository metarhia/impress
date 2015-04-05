module.exports = function(client, callback) {
  application.events.sendGlobal('chat', {
    ip: client.req.connection.remoteAddress,
    name: client.fields.name,
    message: client.fields.message
  });
  callback('Ok');
};
