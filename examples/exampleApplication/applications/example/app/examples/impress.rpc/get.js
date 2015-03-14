module.exports = function(client, callback) {
  if (client.rpc) client.rpc.accept({
    simple: '/examples/simple',
    tools: '/examples/tools',
    memory: '/examples/memory'
  });
  callback();
};
