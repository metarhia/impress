callback => {
  const data = { example: 'hello' };
  application.broadcastToClients('eventToAllInterfaceJSTP', 'eventName', data);
  callback();
};
