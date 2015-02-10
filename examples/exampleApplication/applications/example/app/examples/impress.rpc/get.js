module.exports = function(client, callback) {
  client.rpc.accept({
    simple: '/examples/simple',
    tools: '/examples/tools',
    memory: '/examples/memory'
  });
  callback();
};
