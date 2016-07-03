(client, callback) => {
  callback({
    servers: application.config.balancer.servers
  });
}