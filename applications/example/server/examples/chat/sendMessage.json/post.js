module.exports = function(client, callback) {
  application.frontend.emit('chat', {
    ip: client.req.connection.remoteAddress,
    name: client.fields.name,
    message: client.fields.message
  });
  callback('ok');
};
