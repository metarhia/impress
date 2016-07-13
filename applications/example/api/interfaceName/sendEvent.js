(callback) => {
  connection.event('interfaceName', 'eventName', {
    example: 'hello'
  });
  callback();
}
