(callback) => {
  connection.emitRemoteEvent('interfaceName', 'eventName', {
    example: 'hello'
  });
  callback();
}
