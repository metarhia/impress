module.exports = function(client, callback) {
  client.rpc.accept({
    simple: '/examples/simple',
    tools: '/examples/simple',
    memory: '/examples/memory'
  });
  callback();
};
