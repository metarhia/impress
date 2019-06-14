(client, callback) => {
  // this call must not crash HTTP worker
  const data = { example: 'hello' };
  application.broadcastToClients('eventToAllInterfaceHTTP', 'eventName', data);
  client.context.data = 'Event sent';
  callback();
}
